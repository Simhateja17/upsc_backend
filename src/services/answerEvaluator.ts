import { invokeModelJSON, BedrockMessage } from "../config/llm";
import { extractTextFromFile } from "../config/gemini";
import { downloadFile, STORAGE_BUCKETS } from "../config/storage";
import prisma from "../config/database";
import { buildTopperContext, retrieveTopperMatches } from "./topperRag.service";
import { EvaluatorCheckedCopyPlan, planCheckedCopyAnnotations } from "./checkedCopyPlanner";
import { generateCheckedCopy } from "./checkedCopyGenerator";

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
}

interface QuestionContext {
  questionText: string;
  subject: string;
  marks: number;
  paper: string;
}

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
  checkedCopyStatus?: string | null;
  ragDiagnostics?: any;
  evaluationMode?: "daily" | "pyq" | "mock";
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
 * the typed-answer path and the handwritten OCR path so the rubric, prompt
 * and fallback behavior stay in one place.
 */
async function runAzureEvaluation(
  answerText: string,
  question: QuestionContext,
  ocrNote: boolean,
  topperContext: string
): Promise<EvaluationResult> {
  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  const expectedWords = question.marks >= 15 ? 250 : question.marks >= 10 ? 150 : 100;

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

RAG-CALIBRATION FROM CHECKED TOPPER COPIES:
${topperContext}

${ocrNote ? "NOTE: This text was OCR-extracted from a handwritten sheet. Grade content rigorously but forgive minor spelling/OCR artifacts.\n\n" : ""}GRADING RULES — follow precisely:
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
- Build annotationPlan for the checked-copy image. Use 4-8 sparse red-ink annotations: ticks for good answer points, one margin note for the introduction if useful, margin/bottom comments for missing question demands, and a score annotation. Keep comments short enough to fit in page margins.
- For annotationPlan.targetText, use exact OCR phrases from the student's answer such as a heading or key phrase. If the student omits an entire demand, target the closest existing section and explain what is missing.

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
  "annotationPlan": [
    {
      "type": "positive_tick|underline|circle|bracket|margin_comment|missing_demand|overall_comment|score",
      "targetText": "exact short phrase from the student's OCR text when available; omit only for bottom/score comments",
      "comment": "short red-ink examiner note, max 18 words",
      "placement": "left_margin|right_margin|bottom|near_target|top"
    }
  ],
  "metrics": [
    {"label": "Relevance", "value": <0-10>, "maxValue": 10},
    {"label": "Content", "value": <0-10>, "maxValue": 10},
    {"label": "Structure", "value": <0-10>, "maxValue": 10},
    {"label": "Examples", "value": <0-10>, "maxValue": 10},
    {"label": "Balance", "value": <0-10>, "maxValue": 10}
  ]
}`,
    },
  ];

  const system =
    "You are a senior UPSC Mains evaluator. You grade strictly — like a UPSC examiner whose average mark is ~40%. You never give sympathy marks. You always return valid JSON only, with integer scores. You detect and penalize gibberish, off-topic answers, and factual errors. Your feedback is specific, pointed, and cites exactly what is missing. For annotationPlan, think like a teacher marking the physical answer sheet in red ink: target actual phrases or sections in the student's answer, tick genuinely good points, and mark missing demands clearly in the margin or bottom. Do not invent targetText that is not present in the answer.";

  return invokeModelJSON<EvaluationResult>(messages, {
    system,
    maxTokens: 4096,
    temperature: 0.1,
    serviceName: "answerEvaluator",
  });
}

function hasEvaluatorAnnotationPlan(plan: unknown): plan is EvaluatorCheckedCopyPlan {
  if (!Array.isArray(plan) || plan.length === 0) return false;
  return plan.every((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.comment === "string" && typeof entry.placement === "string";
  });
}

export function normalizeOcrAnswerText(ocrText: string): string {
  const rawLines = ocrText
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
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
    if (/^do not write anything/i.test(lower)) continue;
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
 * Schema-agnostic mains evaluator. Handles the OCR-if-needed → Azure grade →
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
    let viaOcr = false;
    let originalUpload: { buffer: Buffer; contentType: string } | null = null;

    // Handwritten path: OCR the file into text, then reuse the text path.
    if (!textToGrade && fileUrl) {
      const downloadStartedAt = Date.now();
      console.log("[eval] uploaded-answer path: downloading original file", {
        attemptId,
        bucket: STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileUrl,
      });
      originalUpload = await downloadFile(
        STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileUrl
      );
      console.log("[eval] original file downloaded", {
        attemptId,
        elapsed: evalElapsed(downloadStartedAt),
        bytes: originalUpload.buffer.length,
        contentType: originalUpload.contentType,
      });

      const ocrStartedAt = Date.now();
      console.log("[eval] OCR/extraction start", {
        attemptId,
        contentType: originalUpload.contentType,
        bytes: originalUpload.buffer.length,
      });
      const ocrText = await extractTextFromFile(originalUpload.buffer, originalUpload.contentType);
      const normalizedOcrText = normalizeOcrAnswerText(ocrText);
      console.log("[eval] OCR/extraction completed", {
        attemptId,
        elapsed: evalElapsed(ocrStartedAt),
        chars: ocrText.length,
        normalizedChars: normalizedOcrText.length,
        preview: ocrText.slice(0, 220),
        normalizedPreview: normalizedOcrText.slice(0, 220),
      });

      if (normalizedOcrText.length < 20) {
        console.warn("[eval] OCR text too short; completing as unreadable", {
          attemptId,
          chars: normalizedOcrText.length,
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
            "Your uploaded file was received, but our OCR could not extract a readable answer from it. This usually happens with blurry photos, low light, or very faint pencil marks. Please retake the photo with good lighting and clear handwriting, then resubmit — or type the answer directly.",
          evaluatedAt: new Date(),
        });
        return;
      }

      textToGrade = normalizedOcrText;
      viaOcr = true;

      const wordCount = textToGrade.split(/\s+/).filter(Boolean).length;
      await dbOps.saveAttemptText(textToGrade, wordCount);
      console.log("[eval] OCR text saved to attempt", {
        attemptId,
        wordCount,
        chars: textToGrade.length,
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
        };
      }
      const gradingStartedAt = Date.now();
      console.log("[eval] Azure evaluator start", {
        attemptId,
        answerChars: textToGrade.length,
        topperContextChars: topperContext.length,
        viaOcr,
      });
      result = await runAzureEvaluation(textToGrade, question, viaOcr, topperContext);
      console.log("[eval] Azure evaluator completed", {
        attemptId,
        elapsed: evalElapsed(gradingStartedAt),
        rawScore: result.score,
        maxScore: result.maxScore,
        strengths: result.strengths?.length || 0,
        weaknesses: result.weaknesses?.length || 0,
        improvements: result.improvements?.length || 0,
        suggestions: result.suggestions?.length || 0,
        annotationPlanItems: Array.isArray(result.annotationPlan) ? result.annotationPlan.length : 0,
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
      items: Array.isArray(annotationPlan) ? annotationPlan.length : annotationPlan.comments?.length || 0,
      score: clampedScore,
      maxScore: question.marks,
    });

    let checkedCopyUrl: string | null = null;
    let checkedCopyStatus: string | null = originalUpload ? "skipped" : null;
    if (originalUpload && originalUpload.contentType.startsWith("image/")) {
      const checkedCopyStartedAt = Date.now();
      console.log("[eval] checked-copy generation start", {
        attemptId,
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        inputBytes: originalUpload.buffer.length,
        mimeType: originalUpload.contentType,
      });
      const checked = await generateCheckedCopy({
        attemptId,
        originalBuffer: originalUpload.buffer,
        mimeType: originalUpload.contentType,
        annotationPlan,
      });
      checkedCopyStatus = checked.status;
      checkedCopyUrl = checked.status === "completed" ? checked.storagePath : null;
      console.log("[eval] checked-copy generation completed", {
        attemptId,
        elapsed: evalElapsed(checkedCopyStartedAt),
        status: checked.status,
        storagePath: checked.status === "completed" ? checked.storagePath : null,
        reason: checked.status === "failed" ? checked.reason : null,
      });
      if (checked.status === "failed") {
        console.warn("[eval] checked-copy generation failed:", checked.reason);
      }
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
      checkedCopyStatus,
      ragDiagnostics,
      evaluationMode: params.evaluationMode || "daily",
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
