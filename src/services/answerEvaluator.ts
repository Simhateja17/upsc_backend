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
  const messages: BedrockMessage[] = [
    {
      role: "user",
      content: `Evaluate this UPSC Mains answer for the question below.

Question (${question.paper} - ${question.subject}, ${question.marks} marks):
"${question.questionText}"

Student's Answer:
${answerText}

${ocrNote
  ? "This answer was OCR-extracted from a handwritten submission; grade the content rigorously but be lenient about minor spelling artifacts that may come from OCR.\n\n"
  : ""}Score on a scale of 0-${question.marks} based on:
1. Structure & Organization (introduction, body, conclusion)
2. Content Depth & Accuracy
3. Balance of Perspectives (multiple viewpoints)
4. Use of Examples & Facts (data, case studies, reports)
5. Clarity & Language Quality
6. Relevance to Question Asked

Return ONLY a JSON object with:
{
  "score": <number 0-${question.marks}>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "suggestions": ["suggestion1", "suggestion2"],
  "detailedFeedback": "2-3 paragraph detailed feedback",
  "metrics": [
    {"label": "Structure", "value": <0-10>, "maxValue": 10},
    {"label": "Content", "value": <0-10>, "maxValue": 10},
    {"label": "Examples", "value": <0-10>, "maxValue": 10},
    {"label": "Language", "value": <0-10>, "maxValue": 10},
    {"label": "Relevance", "value": <0-10>, "maxValue": 10}
  ]
}`,
    },
  ];

  const system =
    "You are an expert UPSC Mains answer evaluator. You evaluate answers strictly but fairly, like a UPSC examiner. Always return valid JSON only.";

  return invokeModelJSON<EvaluationResult>(messages, {
    system,
    maxTokens: 2048,
    serviceName: "answerEvaluator",
  });
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
    console.log(`[eval] attempt ${attemptId} → markEvaluating (marks=${question.marks})`);
    await dbOps.markEvaluating(question.marks);
    console.log(`[eval] attempt ${attemptId} → markEvaluating OK`);

    let textToGrade = answerText?.trim() || "";
    let viaOcr = false;

    // Handwritten path: OCR the file into text, then reuse the text path.
    if (!textToGrade && fileUrl) {
      console.log(`[eval] attempt ${attemptId} → OCR path: downloading file from ${fileUrl}`);
      const { buffer, contentType } = await downloadFile(
        STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileUrl
      );
      console.log(`[eval] attempt ${attemptId} → download OK (${buffer.length} bytes, ${contentType})`);

      console.log(`[eval] attempt ${attemptId} → calling Gemini OCR...`);
      const ocrText = await extractTextFromFile(buffer, contentType);
      console.log(`[eval] attempt ${attemptId} → OCR OK (${ocrText.length} chars extracted)`);

      if (ocrText.length < 20) {
        console.log(`[eval] attempt ${attemptId} → OCR text too short (<20 chars), marking unreadable`);
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
      console.log(`[eval] attempt ${attemptId} → saving OCR text (${wordCount} words)`);
      await dbOps.saveAttemptText(textToGrade, wordCount);
      console.log(`[eval] attempt ${attemptId} → saveAttemptText OK`);
    }

    if (!textToGrade) {
      throw new Error("No answer text or file URL provided");
    }

    console.log(`[eval] attempt ${attemptId} → calling Azure grading (${textToGrade.length} chars, ocr=${viaOcr})...`);
    const result = await runAzureEvaluation(textToGrade, question, viaOcr);
    console.log(`[eval] attempt ${attemptId} → Azure OK (score: ${result.score}/${question.marks})`);

    await dbOps.saveEvaluation({
      score: Math.min(result.score, question.marks),
      maxScore: question.marks,
      status: "completed",
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      suggestions: result.suggestions || [],
      detailedFeedback: result.detailedFeedback || "",
      evaluatedAt: new Date(),
    });
    console.log(`[eval] attempt ${attemptId} → evaluation saved ✓`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : String(error);
    console.error(`[eval] attempt ${attemptId} FAILED:`, errStack);

    // Fallback: save with baseline estimate but don't crash
    try {
      await dbOps.saveEvaluation({
        score: Math.round(question.marks * 0.5),
        maxScore: question.marks,
        status: "completed",
        strengths: ["Answer submitted successfully"],
        improvements: ["AI evaluation encountered an issue — manual review recommended"],
        suggestions: ["Try resubmitting for a fresh evaluation"],
        detailedFeedback:
          `Evaluation failed: ${errMsg}. Your answer has been scored with a baseline estimate. Please try resubmitting.`,
        evaluatedAt: new Date(),
      });
    } catch (updateError) {
      console.error("[eval] Failed to save fallback evaluation:", updateError);
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
