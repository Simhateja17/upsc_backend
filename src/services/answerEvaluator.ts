import { invokeModelJSON, BedrockMessage } from "../config/llm";
import { extractTextFromFile } from "../config/gemini";
import { downloadFile, STORAGE_BUCKETS } from "../config/storage";
import prisma from "../config/database";

interface EvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailedFeedback: string;
  metrics?: Array<{ label: string; value: number; maxValue: number }>;
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
  ocrNote: boolean
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
  "strengths": ["specific strength tied to the answer — no generic praise"],
  "improvements": ["concrete, actionable — name the missing dimension/fact/structure"],
  "suggestions": ["specific source/report/scheme the student should read to improve"],
  "detailedFeedback": "2-3 paragraph examiner-style feedback: what the answer did, where it falls on the rubric, and exactly what to fix. Be blunt, not encouraging.",
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
    "You are a senior UPSC Mains evaluator. You grade strictly — like a UPSC examiner whose average mark is ~40%. You never give sympathy marks. You always return valid JSON only, with integer scores. You detect and penalize gibberish, off-topic answers, and factual errors. Your feedback is specific, pointed, and cites exactly what is missing.";

  return invokeModelJSON<EvaluationResult>(messages, {
    system,
    maxTokens: 2048,
    temperature: 0.1,
    serviceName: "answerEvaluator",
  });
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
}): Promise<void> {
  const { attemptId, answerText, fileUrl, question, dbOps } = params;

  try {
    await dbOps.markEvaluating(question.marks);

    let textToGrade = answerText?.trim() || "";
    let viaOcr = false;

    // Handwritten path: OCR the file into text, then reuse the text path.
    if (!textToGrade && fileUrl) {
      const { buffer, contentType } = await downloadFile(
        STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileUrl
      );

      const ocrText = await extractTextFromFile(buffer, contentType);

      if (ocrText.length < 20) {
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

      textToGrade = ocrText;
      viaOcr = true;

      const wordCount = textToGrade.split(/\s+/).filter(Boolean).length;
      await dbOps.saveAttemptText(textToGrade, wordCount);
    }

    if (!textToGrade) {
      throw new Error("No answer text or file URL provided");
    }

    // Short-circuit: trivially bad answers (empty, off-topic, gibberish) get
    // graded deterministically instead of being sent to the LLM, so we never
    // reward non-answers with sympathy marks.
    const trivial = triviallyBadAnswer(textToGrade, question);
    let result: EvaluationResult;
    if (trivial) {
      result = trivial;
    } else {
      result = await runAzureEvaluation(textToGrade, question, viaOcr);
    }

    const clampedScore = Math.max(
      0,
      Math.min(Math.round(Number(result.score) || 0), question.marks)
    );
    await dbOps.saveEvaluation({
      score: clampedScore,
      maxScore: question.marks,
      status: "completed",
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      suggestions: result.suggestions || [],
      detailedFeedback: result.detailedFeedback || "",
      metrics: result.metrics || null,
      evaluatedAt: new Date(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[eval] attempt ${attemptId} FAILED:`, errMsg);

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
