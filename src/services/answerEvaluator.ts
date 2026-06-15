import { invokeModelJSON, BedrockMessage } from "../config/llm";
import { renderPdfPagesToImages } from "../config/gemini";
import { downloadFile, STORAGE_BUCKETS } from "../config/storage";
import prisma from "../config/database";
import { buildTopperContext, retrieveTopperMatches } from "./topperRag.service";
import { CheckedCopyAnnotationPlan, EvaluatorCheckedCopyPlan, planCheckedCopyAnnotations } from "./checkedCopyPlanner";
import { generateCheckedCopy } from "./checkedCopyGenerator";
import { transcribeStudentAnswerFromUpload, TranscribedAnswerPage } from "./studentAnswerTranscriber";
import { analyzeDocumentPageLayout, DocumentPageLayout } from "./documentLayout.service";

function evalElapsed(startedAt: number) {
  return `${Date.now() - startedAt}ms`;
}

interface EvaluationResult {
  score: number;
  maxScore?: number;
  wordCount?: number;
  demandCoverage?: Array<{ demand: string; status: "covered" | "partial" | "missing" }>;
  sectionFeedback?: Record<string, unknown>;
  strengths: string[];
  weaknesses?: string[];
  improvements: string[];
  suggestions: string[];
  overallFeedback?: string;
  modelAnswer?: string;
  detailedFeedback: string;
  metrics?: Array<{ label: string; value: number; maxValue: number }>;
  annotationPlan?: EvaluatorCheckedCopyPlan;
  keyTerms?: Array<{ term: string; found: boolean }>;
  nextAttemptFocus?: string;
  evaluatorConclusion?: string;
  modelAnswerKeyPoints?: string[];
  modelAnswerContent?: string;
  parameterScores?: Array<{ parameter: string; score: number; maxScore: number; comment?: string }>;
}

interface QuestionContext {
  questionText: string;
  subject: string;
  marks: number;
  paper: string;
}

type OriginalUploadPage = {
  buffer: Buffer;
  contentType: string;
  sourcePath: string;
};

export interface EvaluationUpdate {
  score: number;
  maxScore: number;
  status: "evaluating" | "completed" | "failed";
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailedFeedback: string;
  metrics?: any; // AI-generated per-dimension metrics
  demandCoverage?: any;
  sectionFeedback?: any;
  modelAnswer?: string | null;
  annotationPlan?: any;
  checkedCopyUrl?: string | null;
  checkedCopyPages?: any;
  checkedCopyStatus?: string | null;
  ragDiagnostics?: any;
  evaluationMode?: "daily" | "pyq" | "mock";
  keyTerms?: any;
  nextAttemptFocus?: string | null;
  evaluatorConclusion?: string | null;
  modelAnswerKeyPoints?: any;
  modelAnswerContent?: string | null;
  parameterScores?: any;
  evaluatedAt: Date | null;
}

/**
 * dbOps lets the generic evaluator work against any (attempt, evaluation)
 * table pair — MainsAttempt/MainsEvaluation, PyqMainsAttempt/PyqMainsEvaluation,
 * or MockTestMainsAttempt/MockTestMainsEvaluation. Callers inject the four
 * operations below and the engine stays schema-agnostic.
 */
export interface EvaluationDbOps {
  markEvaluating: (maxScore: number) => Promise<void>;
  saveAttemptText: (answerText: string, wordCount: number) => Promise<void>;
  saveEvaluation: (update: EvaluationUpdate) => Promise<void>;
}

/**
 * Run the Azure OpenAI evaluator on a piece of answer text. Shared by both
 * the typed-answer path and the handwritten upload path so the rubric, prompt
 * and fallback behavior stay in one place.
 */
async function runAzureEvaluation(
  answerText: string,
  question: QuestionContext,
  uploadTranscriptionNote: boolean,
  topperContext: string,
  answerPages?: TranscribedAnswerPage[]
): Promise<EvaluationResult> {
  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  const expectedWords = question.marks >= 15 ? 250 : question.marks >= 10 ? 150 : 100;
  const readablePages = (answerPages || [])
    .filter((page) => page.studentAnswerText.trim().length > 0)
    .sort((a, b) => a.pageNumber - b.pageNumber);
  const pageSeparatedAnswer = readablePages.length > 0
    ? readablePages
        .map((page) => `[Page ${page.pageNumber}]\n${page.studentAnswerText.trim()}`)
        .join("\n\n")
    : `[Page 1]\n${answerText.trim()}`;
  const pagePlanRule = readablePages.length > 1
    ? `- The answer has ${readablePages.length} uploaded pages. Return one annotationPlan.pagePlans entry per page, with the exact "pageNumber" field. Page 1 comments must target Page 1 answer text only; Page 2 comments must target Page 2 answer text only. Never repeat the same margin comment across pages.`
    : "- Return one annotationPlan.pagePlans entry for pageNumber 1.";

  const messages: BedrockMessage[] = [
    {
      role: "user",
      content: `You are grading a UPSC Civil Services Mains answer. Be strict — UPSC marks are notoriously tight.

QUESTION (${question.paper} · ${question.subject} · ${question.marks} marks · ~${expectedWords} words expected):
"${question.questionText}"

STUDENT'S ANSWER (${wordCount} words):
---
${answerText}
---

PAGE-SEPARATED ANSWER TEXT FOR CHECKED-COPY ANNOTATION:
---
${pageSeparatedAnswer}
---

RAG-CALIBRATION FROM CHECKED TOPPER COPIES:
${topperContext}

${uploadTranscriptionNote ? "NOTE: This text was transcribed from uploaded handwritten page image(s). Grade content rigorously but forgive minor transcription artifacts.\n\n" : ""}GRADING RULES — follow precisely:
- Empty / single-line / gibberish / off-topic answers → score 0-1. Do not reward effort.
- Answer that rephrases the question without substance → 2-4 out of ${question.marks}.
- Answer with some valid points but missing core demand, no examples, no structure → 5-7 out of ${question.marks}.
- Answer that addresses the question directly, has clear structure (intro/body/conclusion), relevant facts, but is incomplete or one-sided → 8-10 out of ${question.marks}.
- Well-structured, multi-dimensional, with specific examples (reports/schemes/data/committees/case studies), balanced conclusion → 11-13 out of ${question.marks}.
- Reserve 14-${question.marks} ONLY for exceptional answers: precise directive (examine/discuss/critically analyze) addressed, original insight, contemporary linkage, committee/data references, crisp conclusion. A topper-level answer.
- Penalize if word count is wildly off (>50% over or under ~${expectedWords}).
- Penalize factual errors heavily. If a claim is wrong, call it out in "improvements".
- NEVER give pity marks. A blank or one-sentence answer should not get more than 1/${question.marks}.
- RAG calibration is binding: treat retrieved checked topper/evaluator copies as scoring anchors, not as automatic marks. If a retrieved answer scored 7/15, award 7/15 only when the student's answer is genuinely at that same standard. If the student's answer is weaker than the retrieved 7/15 answer in demand coverage, specificity, evidence, structure, or balance, award less. Do not award more than the best relevant retrieved example unless the student's answer is clearly and specifically superior, and explain that exact superiority in detailedFeedback. Generic polish is not enough.
- Build annotationPlan as semantic examiner intent, not exact coordinates. The SVG renderer will decide final placement.
- Use annotationPlan version 2. Split detailed markups, light markups, and correctness ticks.
- Density target: create 3-5 marginComments for a normal full page, plus one positive_tick for each correct/relevant semantic answer point. A point may span multiple OCR lines; tick the point title or first distinctive phrase only, not continuation lines.
- Detailed markups are marginComments with severity "major": 18-32 words each, max one compact comment block. Be specific like a teacher: name the missing demand, factual problem, example/data to add, or why a claim is weak.
- Light markups are marginComments with severity "minor": 2-8 words each, e.g. "Wrong name: Nawaz Sharif.", "Factually incorrect.", "Needs example.", "Vague drafting." Use these near factual mistakes or imprecise phrases.
- visualMarks should be positive ticks, underlines, circles, or brackets on exact phrases from the student's answer. Add exactly one positive_tick for each correct/relevant semantic point, especially numbered/bulleted/subheading points. Do not add multiple ticks for different lines of the same point. Use underline/circle weak or wrong phrases, and bracket missed/incomplete sections. Do not target the printed question/header.
- marginComments should name the exact missing content/factual issue/value addition. Do not repeat the same comment across pages.
- If the student omits an entire demand, attach the marginComment to the closest existing answer section and explain the missing demand.
- Include a final bottomComment of 18-35 words that summarizes the scoring reason and highest-priority fixes. Do not write a long paragraph.
${pagePlanRule}
- Every visualMarks[].targetText and marginComments[].targetText must be copied from the same page's student answer text. Do not use targetText from another page.

Rubric weights (for your internal reasoning; surface in metrics):
1. Relevance to directive & question demand (30%)
2. Content depth, accuracy, and factual correctness (25%)
3. Structure & organization — intro, body with sub-headings/points, conclusion (15%)
4. Examples, data, committees, schemes, case studies (15%)
5. Balance of perspectives / multi-dimensional analysis (10%)
6. Language clarity & concision (5%)

Return ONLY a JSON object (no prose, no markdown fences):
{
  "score": <integer 0-${question.marks}>,
  "maxScore": ${question.marks},
  "wordCount": ${wordCount},
  "demandCoverage": [
    {"demand": "specific demand from the question", "status": "covered|partial|missing"}
  ],
  "sectionFeedback": {
    "introduction": {"status": "good|weak|missing", "feedback": "specific feedback"},
    "body": {"status": "good|weak|missing", "feedback": "specific feedback"},
    "conclusion": {"status": "good|weak|missing", "feedback": "specific feedback"}
  },
  "strengths": ["specific strength tied to the answer — no generic praise"],
  "weaknesses": ["specific weakness or missing demand"],
  "improvements": ["concrete, actionable — name the missing dimension/fact/structure"],
  "suggestions": ["specific source/report/scheme the student should read to improve"],
  "overallFeedback": "short examiner-style overall comment",
  "modelAnswer": "concise model answer calibrated to the marks and word limit",
  "detailedFeedback": "2-3 paragraph examiner-style feedback: what the answer did, where it falls on the rubric, and exactly what to fix. Be blunt, not encouraging.",
  "annotationPlan": {
    "version": 2,
    "scoreText": "same integer score/maxScore, e.g. \"4/${question.marks}\"",
    "pagePlans": [
      {
        "pageNumber": 1,
        "visualMarks": [
          {
            "type": "positive_tick|underline|circle|bracket",
            "targetText": "exact phrase from the student's answer only, never the printed question",
            "intent": "why this mark is placed"
          }
        ],
        "marginComments": [
          {
            "targetText": "exact phrase from the student's answer near the issue",
            "severity": "major|minor",
            "comment": "teacher-style comment, 18-45 words, specific and content-rich",
            "placementIntent": "left_margin|right_margin|near_target"
          }
        ],
        "bottomComment": "final examiner summary with missing demands and concrete additions"
      }
    ]
  },
  "metrics": [
    {"label": "Relevance", "value": <0-10>, "maxValue": 10},
    {"label": "Content", "value": <0-10>, "maxValue": 10},
    {"label": "Structure", "value": <0-10>, "maxValue": 10},
    {"label": "Examples", "value": <0-10>, "maxValue": 10},
    {"label": "Balance", "value": <0-10>, "maxValue": 10}
  ],
  "keyTerms": [
    {"term": "specific keyword/scheme/report/concept an examiner expects for this question", "found": <true if the student's answer uses this term, else false>}
  ],
  "nextAttemptFocus": "1-2 sentences telling the student exactly what to focus on in their next attempt at a similar question",
  "evaluatorConclusion": "2-3 sentence overall verdict in an encouraging-but-honest examiner tone, naming the single biggest gap and what score the answer could realistically reach if fixed",
  "modelAnswerKeyPoints": ["short bullet point the model answer must hit", "..."],
  "modelAnswerContent": "the full model answer text, written in the same style as 'modelAnswer' but as flowing paragraphs with an intro, body points, and conclusion",
  "parameterScores": [
    {"parameter": "Demand Fulfilment", "score": <0-${question.marks}, scaled to this parameter's weight>, "maxScore": <weighted max for this parameter>, "comment": "specific feedback for this parameter"},
    {"parameter": "Conceptual Clarity", "score": <number>, "maxScore": <number>, "comment": "..."},
    {"parameter": "Analysis & Depth", "score": <number>, "maxScore": <number>, "comment": "..."},
    {"parameter": "Knowledge Enrichment", "score": <number>, "maxScore": <number>, "comment": "..."},
    {"parameter": "Structure & Flow", "score": <number>, "maxScore": <number>, "comment": "..."},
    {"parameter": "Value Addition", "score": <number>, "maxScore": <number>, "comment": "..."},
    {"parameter": "Presentation", "score": <number>, "maxScore": <number>, "comment": "..."}
  ]
}

For "keyTerms", list 6-10 terms (mix of found and missing). For "parameterScores", the seven maxScore values must sum to exactly ${question.marks} and the seven score values must sum to exactly the overall "score" value above.`,
    },
  ];

  const system =
    "You are a senior UPSC Mains evaluator. You grade strictly — like a UPSC examiner whose average mark is ~40%. You never give sympathy marks. You always return valid JSON only, with integer scores. You detect and penalize gibberish, off-topic answers, and factual errors. Your feedback is specific, pointed, and cites exactly what is missing. For annotationPlan, return semantic marking intent for an SVG checked-copy renderer: use exact targetText from the student's answer, never target printed question/header text, use detailed teacher-style margin comments, and separate visual marks from comments. Do not invent targetText that is not present in the answer.";

  return invokeModelJSON<EvaluationResult>(messages, {
    system,
    maxTokens: 4096,
    temperature: 0.1,
    serviceName: "answerEvaluator",
  });
}

function hasEvaluatorAnnotationPlan(plan: unknown): plan is EvaluatorCheckedCopyPlan {
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const entry = plan as Record<string, unknown>;
    if (entry.version !== 2 || !Array.isArray(entry.pagePlans)) return false;
    return entry.pagePlans.length > 0;
  }
  if (!Array.isArray(plan) || plan.length === 0) return false;
  return plan.every((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.comment === "string" && typeof entry.placement === "string";
  });
}

function annotationPlanItemCount(plan: EvaluatorCheckedCopyPlan | CheckedCopyAnnotationPlan): number {
  if (Array.isArray(plan)) return plan.length;
  if ("version" in plan && plan.version === 2) {
    return plan.pagePlans.reduce(
      (sum, page) => sum + (page.visualMarks?.length || 0) + (page.marginComments?.length || 0) + (page.bottomComment ? 1 : 0),
      0
    );
  }
  return (plan as CheckedCopyAnnotationPlan).comments?.length || 0;
}

function parseAnswerUploadPaths(fileUrl: string | null): string[] {
  if (!fileUrl) return [];
  const trimmed = fileUrl.trim();
  if (!trimmed.startsWith("[")) return [trimmed];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [trimmed];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [trimmed];
  }
}

function stripOcrChrome(line: string): string {
  let cleaned = line;

  cleaned = cleaned.replace(/\b(call|contact|phone|tel|mobile)\s*(?:us)?\s*[:.]?\s*[\d,\s()+-]{7,}/gi, " ");
  cleaned = cleaned.replace(/\bvisit\s+us\s*[:.]?\s*(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\b/gi, " ");
  cleaned = cleaned.replace(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?\b/gi, " ");
  cleaned = cleaned.replace(/\bpage\s+\d+\s+of\s+\d+\b/gi, " ");
  cleaned = cleaned.replace(/\b\d{3,6}\s+[A-Z][A-Z\s]{3,}(?:™|tm)?\b/g, " ");
  cleaned = cleaned.replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ");
  cleaned = cleaned.replace(/\b[\w.+-]+@\b/g, " ");
  cleaned = cleaned.replace(/[™®©]/g, " ");
  cleaned = cleaned.replace(/\bdo\s+not\s+write\s+anything\s+in\s+this\s+margin\b/gi, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

export function normalizeOcrAnswerText(ocrText: string): string {
  const rawLines = ocrText
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => stripOcrChrome(line.replace(/\s+/g, " ").trim()))
    .filter(Boolean);

  const lines: string[] = [];
  let skipNextNumeric = false;

  for (const line of rawLines) {
    const lower = line.toLowerCase();
    if (/^q\.?\s*no\.?$/i.test(line) || /^q\.?\s*no\.?\s*[:.-]?\s*\d*$/i.test(line)) {
      skipNextNumeric = true;
      continue;
    }
    if (/^marks?$/i.test(line)) {
      skipNextNumeric = true;
      continue;
    }
    if (/^page\s*no\.?\s*\d*$/i.test(line)) continue;
    if (/^page\s+\d+\s+of\s+\d+$/i.test(line)) continue;
    if (/^do not write anything/i.test(lower)) continue;
    if (/^(call|contact|phone|tel|mobile|visit us|www\.|https?:\/\/)/i.test(lower)) continue;
    if (/^[A-Z][A-Z\s]{3,}(?:™|tm)?$/.test(line)) continue;
    if (/^\d{3,6}$/.test(line)) continue;
    if (/^answer writing practice$/i.test(line)) continue;
    if (/^upsc$/i.test(line)) continue;
    if (skipNextNumeric && /^\d+\.?$/.test(line)) {
      skipNextNumeric = false;
      continue;
    }
    skipNextNumeric = false;
    lines.push(line);
  }

  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    const isHeading = /^(introduction|conclusion|however|therefore|way forward|how far\b|before the war\b)/i.test(line);
    const isListStart = /^(\(?\d+\)?[).:-]?|[a-z][).:-])\s+/.test(line);

    if (!current) {
      current = line;
      continue;
    }

    const previousEndsSentence = /[.!?;:]$/.test(current);
    const shortPrevious = current.split(/\s+/).length <= 3;
    const shortLine = line.split(/\s+/).length <= 3;

    if (isHeading || isListStart || (previousEndsSentence && !shortLine && !shortPrevious)) {
      paragraphs.push(current);
      current = line;
    } else {
      current += ` ${line}`;
    }
  }

  if (current) paragraphs.push(current);

  return paragraphs
    .map((paragraph) =>
      paragraph
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/\b([A-Za-z])\s*-\s*([A-Za-z])\b/g, "$1-$2")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

function computeRagScoreCap(
  matches: Array<{ awarded_marks: number | null; max_marks: number | null; similarity: number }>,
  maxScore: number
): { cap: number | null; reason: string | null } {
  const comparable = matches
    .filter((match) => match.awarded_marks != null)
    .filter((match) => !match.max_marks || match.max_marks === maxScore)
    .filter((match) => Number(match.similarity || 0) >= 0.45);

  if (comparable.length === 0) {
    return { cap: null, reason: null };
  }

  const cap = Math.max(...comparable.map((match) => Number(match.awarded_marks)));
  const superiorAnswerCeiling = Math.min(maxScore, Math.ceil(cap) + 1);
  return {
    cap: superiorAnswerCeiling,
    reason: `Anchored to best comparable RAG score ${cap}; allowing up to ${superiorAnswerCeiling}/${maxScore} only for a clearly superior answer.`,
  };
}

/**
 * Short-circuit grader for obvious non-answers. Saves an Azure call and
 * prevents the model from accidentally rewarding gibberish or empty input.
 * Returns null when the answer looks legitimate and should be sent to the LLM.
 * Exported for testability — pure function, no dependencies.
 */
export function triviallyBadAnswer(
  answerText: string,
  question: QuestionContext
): EvaluationResult | null {
  const text = answerText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const tooShort = wordCount < 15;
  const mostlyNonAlpha = text.replace(/[^A-Za-z]/g, "").length < Math.max(20, text.length * 0.4);

  // Keyword overlap with the question — if the answer shares almost no content
  // words with the question, it's almost certainly off-topic.
  const stop = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "is", "are", "was", "were",
    "be", "been", "with", "for", "by", "at", "as", "that", "this", "it", "its",
    "from", "how", "what", "why", "which", "has", "have", "had", "do", "does",
    "did", "india", "indian",
  ]);
  const qTokens = new Set(
    question.questionText
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3 && !stop.has(w))
  );
  const overlap = words.filter((w) => qTokens.has(w.toLowerCase().replace(/[^a-z]/g, ""))).length;
  const noOverlap = qTokens.size >= 3 && overlap === 0 && wordCount >= 20;

  if (!tooShort && !mostlyNonAlpha && !noOverlap) return null;

  const reason = tooShort
    ? `Answer is too short (${wordCount} words). UPSC mains answers for ${question.marks} marks need roughly ${question.marks >= 15 ? 250 : 150} words.`
    : mostlyNonAlpha
      ? "Answer is unreadable or contains mostly non-text characters."
      : "Answer does not address the question — it does not engage with any of the key terms in the directive.";

  return {
    score: tooShort && wordCount >= 10 ? 1 : 0,
    strengths: [],
    improvements: [
      reason,
      "Read the question's directive word carefully (examine / discuss / critically analyze) and structure your answer around it.",
      "Target roughly " + (question.marks >= 15 ? "250 words with 3-4 body sub-points" : "150 words with 2-3 body points") + ", plus a crisp intro and conclusion.",
    ],
    suggestions: [
      "Revise the relevant chapter before re-attempting.",
      "Practise a topic-based answer first with bullet-pointed structure to build muscle memory.",
    ],
    detailedFeedback: reason + " No further grading was possible — please resubmit a full answer that directly addresses the question.",
  };
}

/**
 * Schema-agnostic mains evaluator. Handles the upload transcription → RAG → Azure grade →
 * persist flow, calling into `dbOps` so the caller decides which Prisma
 * tables get written. Used by Daily Answer, PYQ Mains and Mock Test Mains.
 */
export async function evaluateAnswerGeneric(params: {
  attemptId: string;
  answerText: string | null;
  fileUrl: string | null;
  question: QuestionContext;
  dbOps: EvaluationDbOps;
  evaluationMode?: "daily" | "pyq" | "mock";
}): Promise<void> {
  const { attemptId, answerText, fileUrl, question, dbOps } = params;
  const evaluationStartedAt = Date.now();

  try {
    console.log("[eval] started", {
      attemptId,
      mode: params.evaluationMode || "daily",
      hasTypedAnswer: Boolean(answerText?.trim()),
      hasFile: Boolean(fileUrl),
      paper: question.paper,
      subject: question.subject,
      marks: question.marks,
      questionPreview: question.questionText.slice(0, 120),
    });
    await dbOps.markEvaluating(question.marks);
    console.log("[eval] status marked evaluating", {
      attemptId,
      elapsed: evalElapsed(evaluationStartedAt),
    });

    let textToGrade = answerText?.trim() || "";
    let viaUploadTranscription = false;
    let originalUpload: OriginalUploadPage | null = null;
    let originalUploads: OriginalUploadPage[] = [];
    let transcriptionDiagnostics: Record<string, unknown> | null = null;
    let transcriptionPages: TranscribedAnswerPage[] | undefined;

    // Handwritten/upload path: transcribe the file with Azure vision, then reuse the text path.
    if (!textToGrade && fileUrl) {
      const uploadPaths = parseAnswerUploadPaths(fileUrl);
      const downloadStartedAt = Date.now();
      console.log("[eval] uploaded-answer path: downloading original file", {
        attemptId,
        bucket: STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileUrl,
        uploadPaths,
      });
      originalUploads = await Promise.all(
        uploadPaths.map(async (path) => {
          const downloaded = await downloadFile(
            STORAGE_BUCKETS.ANSWER_UPLOADS,
            path
          );
          return { ...downloaded, sourcePath: path };
        })
      );
      originalUpload = originalUploads[0] || null;
      console.log("[eval] original file downloaded", {
        attemptId,
        elapsed: evalElapsed(downloadStartedAt),
        files: originalUploads.length,
        bytes: originalUploads.map((upload) => upload.buffer.length),
        contentTypes: originalUploads.map((upload) => upload.contentType),
      });
      if (originalUploads.length === 0 || !originalUpload) {
        throw new Error("No uploaded answer files could be downloaded");
      }

      const transcriptionStartedAt = Date.now();
      console.log("[eval] upload transcription start", {
        attemptId,
        files: originalUploads.length,
        contentTypes: originalUploads.map((upload) => upload.contentType),
        bytes: originalUploads.map((upload) => upload.buffer.length),
      });
      const transcription = await transcribeStudentAnswerFromUpload({
        fileBuffer: originalUploads.length === 1
          ? originalUpload.buffer
          : Buffer.concat(originalUploads.map((upload) => upload.buffer)),
        mimeType: originalUploads.length === 1
          ? originalUpload.contentType
          : "application/x-upsc-multi-image",
        files: originalUploads.length > 1
          ? originalUploads.map((upload) => ({
              buffer: upload.buffer,
              mimeType: upload.contentType,
            }))
          : undefined,
        questionText: question.questionText,
        paper: question.paper,
        subject: question.subject,
        marks: question.marks,
        attemptId,
      });
      const transcribedAnswer = transcription.transcribedAnswer.trim();
      console.log("[eval] upload transcription completed", {
        attemptId,
        elapsed: evalElapsed(transcriptionStartedAt),
        chars: transcribedAnswer.length,
        pages: transcription.pages.length,
        confidence: transcription.confidence,
        warnings: transcription.warnings,
        preview: transcribedAnswer.slice(0, 240),
      });
      transcriptionDiagnostics = {
        ...(transcription.diagnostics || { pages: transcription.pages.length }),
        warnings: transcription.warnings,
        confidence: transcription.confidence,
      };
      transcriptionPages = transcription.pages;

      if (transcribedAnswer.length < 20) {
        console.warn("[eval] upload transcription too short; completing as unreadable", {
          attemptId,
          chars: transcribedAnswer.length,
          confidence: transcription.confidence,
          warnings: transcription.warnings,
        });
        await dbOps.saveEvaluation({
          score: 0,
          maxScore: question.marks,
          status: "completed",
          strengths: [],
          improvements: [
            "We couldn't read the handwriting from your uploaded file.",
            "Retake the photo in bright, even lighting with the page flat.",
            "Make sure the whole answer is in frame and in focus.",
          ],
          suggestions: [
            "Try a high-resolution scan or PDF if possible.",
            "Alternatively, type your answer directly for an instant evaluation.",
          ],
          detailedFeedback:
            "Your uploaded file was received, but the answer transcription could not extract a readable response from it. This usually happens with blurry photos, low light, very faint pencil marks, or pages where the answer is not visible. Please retake the photo with good lighting and clear handwriting, then resubmit — or type the answer directly.",
          evaluatedAt: new Date(),
        });
        return;
      }

      textToGrade = transcribedAnswer;
      viaUploadTranscription = true;

      const wordCount = textToGrade.split(/\s+/).filter(Boolean).length;
      await dbOps.saveAttemptText(textToGrade, wordCount);
      console.log("[eval] transcribed answer saved to attempt", {
        attemptId,
        wordCount,
        chars: textToGrade.length,
        confidence: transcription.confidence,
      });
    }

    if (!textToGrade) {
      throw new Error("No answer text or file URL provided");
    }

    // Short-circuit: trivially bad answers (empty, off-topic, gibberish) get
    // graded deterministically instead of being sent to the LLM, so we never
    // reward non-answers with sympathy marks.
    const trivial = triviallyBadAnswer(textToGrade, question);
    let result: EvaluationResult;
    let retrievedMatches: Awaited<ReturnType<typeof retrieveTopperMatches>> = [];
    let ragDiagnostics: Record<string, unknown> = {
      used: false,
      attempted: false,
      matchCount: 0,
      error: null,
      transcription: transcriptionDiagnostics,
    };
    if (trivial) {
      console.warn("[eval] deterministic trivial-answer result", {
        attemptId,
        score: trivial.score,
        reason: trivial.detailedFeedback,
      });
      result = trivial;
    } else {
      let topperContext = "No comparable topper answers were retrieved. Grade from the rubric only.";
      try {
        const ragStartedAt = Date.now();
        console.log("[eval] Topper RAG retrieval start", {
          attemptId,
          paper: question.paper,
          subject: question.subject,
          marks: question.marks,
          answerChars: textToGrade.length,
        });
        const matches = await retrieveTopperMatches({
          questionText: question.questionText,
          answerText: textToGrade,
          paper: question.paper,
          subject: question.subject,
          maxMarks: question.marks,
        });
        retrievedMatches = matches;
        topperContext = buildTopperContext(matches);
        ragDiagnostics = {
          used: matches.length > 0,
          attempted: true,
          matchCount: matches.length,
          contextChars: topperContext.length,
          topMatches: matches.slice(0, 5).map((m) => ({
            answerId: m.answer_id,
            chunkId: m.chunk_id,
            chunkType: m.chunk_type,
            paperGroup: m.paper_group,
            score: m.awarded_marks != null && m.max_marks ? `${m.awarded_marks}/${m.max_marks}` : null,
            scoreBand: m.score_band,
            qualityStatus: m.quality_status,
            similarity: Number(m.similarity || 0),
            questionPreview: m.question_text?.slice(0, 180) || null,
          })),
          error: null,
          transcription: transcriptionDiagnostics,
        };
        console.log("[eval] Topper RAG retrieval completed", {
          attemptId,
          elapsed: evalElapsed(ragStartedAt),
          matches: matches.length,
          contextChars: topperContext.length,
          top: matches.slice(0, 3).map((m) => ({
            answerId: m.answer_id,
            score: m.awarded_marks != null && m.max_marks ? `${m.awarded_marks}/${m.max_marks}` : null,
            paperGroup: m.paper_group,
            similarity: Number(m.similarity || 0).toFixed(3),
          })),
        });
      } catch (error) {
        console.warn("[eval] Topper RAG unavailable:", error instanceof Error ? error.message : error);
        ragDiagnostics = {
          used: false,
          attempted: true,
          matchCount: 0,
          error: error instanceof Error ? error.message : String(error),
          transcription: transcriptionDiagnostics,
        };
      }
      const gradingStartedAt = Date.now();
      console.log("[eval] Azure evaluator start", {
        attemptId,
        answerChars: textToGrade.length,
        topperContextChars: topperContext.length,
        viaUploadTranscription,
      });
      result = await runAzureEvaluation(textToGrade, question, viaUploadTranscription, topperContext, transcriptionPages);
      console.log("[eval] Azure evaluator completed", {
        attemptId,
        elapsed: evalElapsed(gradingStartedAt),
        rawScore: result.score,
        maxScore: result.maxScore,
        strengths: result.strengths?.length || 0,
        weaknesses: result.weaknesses?.length || 0,
        improvements: result.improvements?.length || 0,
        suggestions: result.suggestions?.length || 0,
        annotationPlanItems: result.annotationPlan ? annotationPlanItemCount(result.annotationPlan) : 0,
      });
    }

    const rawClampedScore = Math.max(
      0,
      Math.min(Math.round(Number(result.score) || 0), question.marks)
    );
    const ragCap = computeRagScoreCap(retrievedMatches, question.marks);
    const clampedScore =
      ragCap.cap == null ? rawClampedScore : Math.min(rawClampedScore, Math.floor(ragCap.cap));
    if (ragCap.cap != null && clampedScore < rawClampedScore) {
      console.warn("[eval] score capped by RAG calibration", {
        attemptId,
        rawScore: rawClampedScore,
        cappedScore: clampedScore,
        cap: ragCap.cap,
        reason: ragCap.reason,
      });
      ragDiagnostics = {
        ...ragDiagnostics,
        scoreCap: {
          applied: true,
          rawScore: rawClampedScore,
          cappedScore: clampedScore,
          cap: ragCap.cap,
          reason: ragCap.reason,
        },
      };
    } else {
      ragDiagnostics = {
        ...ragDiagnostics,
        scoreCap: {
          applied: false,
          rawScore: rawClampedScore,
          cappedScore: clampedScore,
          cap: ragCap.cap,
          reason: ragCap.reason,
        },
      };
    }

    const annotationPlan = hasEvaluatorAnnotationPlan(result.annotationPlan)
      ? result.annotationPlan
      : planCheckedCopyAnnotations({
          score: clampedScore,
          maxScore: question.marks,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || result.improvements || [],
          suggestions: result.suggestions || [],
          overallFeedback: result.overallFeedback || result.detailedFeedback || "",
        });
    console.log("[eval] annotation plan selected", {
      attemptId,
      source: hasEvaluatorAnnotationPlan(result.annotationPlan) ? "evaluator" : "fallback",
      items: annotationPlanItemCount(annotationPlan),
      score: clampedScore,
      maxScore: question.marks,
    });

    let checkedCopyUrl: string | null = null;
    let checkedCopyPages: Array<{ pageNumber: number; storagePath: string | null; status: string; reason?: string }> = [];
    let checkedCopyStatus: string | null = originalUploads.length > 0 ? "skipped" : null;
    let checkedCopyInputs: Array<{ pageNumber: number; buffer: Buffer; contentType: string; source: "image" | "pdf-page"; layout?: DocumentPageLayout | null }> = [];
    if (originalUploads.length > 1 && originalUploads.every((upload) => upload.contentType.startsWith("image/"))) {
      checkedCopyInputs = originalUploads.map((upload, index) => ({
        pageNumber: index + 1,
        buffer: upload.buffer,
        contentType: upload.contentType,
        source: "image",
      }));
    } else if (originalUpload?.contentType.startsWith("image/")) {
      checkedCopyInputs = [{
        pageNumber: 1,
        buffer: originalUpload.buffer,
        contentType: originalUpload.contentType,
        source: "image",
      }];
    } else if (originalUpload?.contentType === "application/pdf") {
      const renderStartedAt = Date.now();
      const maxPages = Number(process.env.AZURE_OPENAI_OCR_MAX_PAGES || process.env.OCR_PDF_MAX_PAGES || 6);
      console.log("[eval] checked-copy PDF render start", {
        attemptId,
        bytes: originalUpload.buffer.length,
        maxPages,
      });
      const pages = await renderPdfPagesToImages(originalUpload.buffer, maxPages);
      checkedCopyInputs = pages.map((buffer, index) => ({
          pageNumber: index + 1,
          buffer,
          contentType: "image/png",
          source: "pdf-page" as const,
      }));
      console.log("[eval] checked-copy PDF render completed", {
        attemptId,
        elapsed: evalElapsed(renderStartedAt),
        renderedPages: pages.length,
        pageBytes: pages.map((page) => page.length),
      });
    }

    if (checkedCopyInputs.length > 0) {
      if (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
        const layoutStartedAt = Date.now();
        console.log("[eval] checked-copy layout analysis start", {
          attemptId,
          pages: checkedCopyInputs.length,
        });
        checkedCopyInputs = await Promise.all(
          checkedCopyInputs.map(async (input) => {
            try {
              const layout = await analyzeDocumentPageLayout({
                imageBuffer: input.buffer,
                mimeType: input.contentType,
                pageNumber: input.pageNumber,
                attemptId,
              });
              return { ...input, layout };
            } catch (error) {
              console.warn("[eval] checked-copy layout analysis failed for page", {
                attemptId,
                pageNumber: input.pageNumber,
                message: error instanceof Error ? error.message : String(error),
              });
              return { ...input, layout: null };
            }
          })
        );
        console.log("[eval] checked-copy layout analysis completed", {
          attemptId,
          elapsed: evalElapsed(layoutStartedAt),
          pages: checkedCopyInputs.map((input) => ({
            pageNumber: input.pageNumber,
            lines: input.layout?.lines.length || 0,
          })),
        });
      }

      const checkedCopyStartedAt = Date.now();
      console.log("[eval] checked-copy generation start", {
        attemptId,
        renderer: "deterministic-svg",
        pages: checkedCopyInputs.length,
        inputBytes: checkedCopyInputs.map((input) => input.buffer.length),
      });
      for (const input of checkedCopyInputs) {
        const checked = await generateCheckedCopy({
          attemptId,
          pageNumber: input.pageNumber,
          totalPages: checkedCopyInputs.length,
          originalBuffer: input.buffer,
          mimeType: input.contentType,
          annotationPlan,
          layout: input.layout,
        });
        if (checked.status === "completed") {
          checkedCopyPages.push({
            pageNumber: input.pageNumber,
            storagePath: checked.storagePath,
            status: checked.status,
          });
          if (!checkedCopyUrl) checkedCopyUrl = checked.storagePath;
        } else {
          checkedCopyPages.push({
            pageNumber: input.pageNumber,
            storagePath: null,
            status: checked.status,
            reason: checked.reason,
          });
        }
      }
      checkedCopyStatus = checkedCopyPages.some((page) => page.status === "completed")
        ? checkedCopyPages.every((page) => page.status === "completed")
          ? "completed"
          : "partial"
        : "failed";
      console.log("[eval] checked-copy generation completed", {
        attemptId,
        elapsed: evalElapsed(checkedCopyStartedAt),
        status: checkedCopyStatus,
        pages: checkedCopyPages,
      });
    }

    await dbOps.saveEvaluation({
      score: clampedScore,
      maxScore: question.marks,
      status: "completed",
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      suggestions: result.suggestions || [],
      detailedFeedback: result.detailedFeedback || "",
      metrics: result.metrics || null,
      demandCoverage: result.demandCoverage || [],
      sectionFeedback: result.sectionFeedback || null,
      modelAnswer: result.modelAnswer || null,
      annotationPlan,
      checkedCopyUrl,
      checkedCopyPages,
      checkedCopyStatus,
      ragDiagnostics,
      evaluationMode: params.evaluationMode || "daily",
      keyTerms: result.keyTerms || null,
      nextAttemptFocus: result.nextAttemptFocus || null,
      evaluatorConclusion: result.evaluatorConclusion || null,
      modelAnswerKeyPoints: result.modelAnswerKeyPoints || null,
      modelAnswerContent: result.modelAnswerContent || null,
      parameterScores: result.parameterScores || null,
      evaluatedAt: new Date(),
    });
    console.log("[eval] completed and saved", {
      attemptId,
      elapsed: evalElapsed(evaluationStartedAt),
      score: clampedScore,
      maxScore: question.marks,
      checkedCopyStatus,
      checkedCopyUrl,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[eval] FAILED", {
      attemptId,
      elapsed: evalElapsed(evaluationStartedAt),
      message: errMsg,
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Record the failure honestly — do NOT award sympathy marks. The user
    // should see that the evaluator failed and be offered a resubmit, rather
    // than a silent 50% that masks the real problem.
    try {
      await dbOps.saveEvaluation({
        score: 0,
        maxScore: question.marks,
        status: "failed",
        strengths: [],
        improvements: ["AI evaluation could not complete — please resubmit."],
        suggestions: ["If the issue persists, type the answer directly instead of uploading a file."],
        detailedFeedback: `Evaluation failed: ${errMsg}. Your answer was received but not graded. Please resubmit.`,
        evaluatedAt: new Date(),
      });
    } catch (updateError) {
      console.error("[eval] Failed to save failure marker:", updateError);
    }
  }
}

/**
 * Daily Answer wrapper — the existing callsite. Wires up Prisma's
 * mainsAttempt / mainsEvaluation tables as the dbOps target.
 */
export async function evaluateAnswer(
  attemptId: string,
  answerText: string | null,
  question: QuestionContext,
  fileUrl?: string | null
): Promise<void> {
  const dbOps: EvaluationDbOps = {
    markEvaluating: async (maxScore) => {
      await prisma.mainsEvaluation.upsert({
        where: { attemptId },
        create: {
          attemptId,
          score: 0,
          maxScore,
          status: "evaluating",
          strengths: [],
          improvements: [],
          suggestions: [],
        },
        update: { status: "evaluating" },
      });
    },
    saveAttemptText: async (text, wordCount) => {
      await prisma.mainsAttempt.update({
        where: { id: attemptId },
        data: { answerText: text, wordCount },
      });
    },
    saveEvaluation: async (update) => {
      await prisma.mainsEvaluation.update({
        where: { attemptId },
        data: update,
      });
    },
  };

  await evaluateAnswerGeneric({
    attemptId,
    answerText,
    fileUrl: fileUrl ?? null,
    question,
    dbOps,
  });
}
