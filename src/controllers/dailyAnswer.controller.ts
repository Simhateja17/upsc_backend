import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { evaluateAnswer } from "../services/answerEvaluator";
import { sendEvaluationComplete } from "../services/emailService";
import { uploadFile, STORAGE_BUCKETS } from "../config/storage";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/daily-answer/today
 * Today's mains question metadata
 */
export const getTodayQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = getToday();
    const question = await prisma.dailyMainsQuestion.findUnique({
      where: { date: today },
      select: { id: true, title: true, paper: true, subject: true, marks: true, wordLimit: true, timeLimit: true },
    });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question available for today" });
    }

    // Check if user attempted
    let attempted = false;
    let attemptCount = 0;
    if (req.user) {
      const attempt = await prisma.mainsAttempt.findUnique({
        where: { userId_questionId: { userId: req.user.id, questionId: question.id } },
      });
      attempted = !!attempt?.submittedAt;
    }
    attemptCount = await prisma.mainsAttempt.count({ where: { questionId: question.id } });

    res.json({ status: "success", data: { ...question, attempted, attemptCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-answer/today/question
 * Full question text with instructions
 */
export const getTodayFullQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = getToday();
    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    const attemptCount = await prisma.mainsAttempt.count({ where: { questionId: question.id } });

    res.json({ status: "success", data: { ...question, attemptCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/daily-answer/today/submit-text
 * Submit typed answer: { answerText }
 */
export const submitTextAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { answerText } = req.body;
    console.log(`[Daily Answer] Text submission by user: ${userId}, length: ${answerText?.length || 0}`);

    if (!answerText || answerText.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Answer text is required" });
    }

    const today = getToday();
    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    const wordCount = answerText.trim().split(/\s+/).length;

    const attempt = await prisma.mainsAttempt.upsert({
      where: { userId_questionId: { userId, questionId: question.id } },
      create: {
        userId,
        questionId: question.id,
        answerText,
        wordCount,
        submittedAt: new Date(),
      },
      update: { answerText, wordCount, submittedAt: new Date() },
    });

    // Start evaluation (real Azure OpenAI scoring for typed answers)
    await startEvaluation(attempt.id, answerText, question, null);

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        type: "answer",
        title: "Submitted Daily Answer",
        description: `${question.subject} - ${wordCount} words`,
      },
    });

    res.json({ status: "success", data: { attemptId: attempt.id, status: "evaluating" } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/daily-answer/today/upload
 * Upload answer file (placeholder - stores file URL)
 */
export const uploadAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    console.log(`[Daily Answer] File upload by user: ${userId}, file: ${req.file?.originalname || "URL"}`);
    const today = getToday();
    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    let fileUrl: string | null = null;

    // Handle file upload via multer
    if (req.file) {
      const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
      await uploadFile(
        STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
      fileUrl = fileName;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    if (!fileUrl) {
      return res.status(400).json({ status: "error", message: "File upload is required" });
    }

    const attempt = await prisma.mainsAttempt.upsert({
      where: { userId_questionId: { userId, questionId: question.id } },
      create: { userId, questionId: question.id, fileUrl, submittedAt: new Date() },
      update: { fileUrl, submittedAt: new Date() },
    });

    await startEvaluation(attempt.id, null, question, attempt.fileUrl);

    await prisma.userActivity.create({
      data: { userId, type: "answer", title: "Uploaded Daily Answer", description: question.subject },
    });

    res.json({ status: "success", data: { attemptId: attempt.id, status: "evaluating" } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-answer/today/evaluation-status
 * Check evaluation status
 */
export const getEvaluationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });
    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    const attempt = await prisma.mainsAttempt.findUnique({
      where: { userId_questionId: { userId, questionId: question.id } },
      include: { evaluation: true },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found" });
    }

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        evaluationStatus: attempt.evaluation?.status || "pending",
        isComplete: attempt.evaluation?.status === "completed",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-answer/today/results
 * AI evaluation results
 */
export const getTodayResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });
    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    const attempt = await prisma.mainsAttempt.findUnique({
      where: { userId_questionId: { userId, questionId: question.id } },
      include: { evaluation: true },
    });

    if (!attempt || !attempt.evaluation) {
      return res.status(404).json({ status: "error", message: "No evaluation results found" });
    }

    res.json({
      status: "success",
      data: {
        score: attempt.evaluation.score,
        maxScore: attempt.evaluation.maxScore,
        strengths: attempt.evaluation.strengths,
        improvements: attempt.evaluation.improvements,
        suggestions: attempt.evaluation.suggestions,
        detailedFeedback: attempt.evaluation.detailedFeedback,
        wordCount: attempt.wordCount,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Real AI evaluation using Azure OpenAI (typed) or Gemini OCR → Azure OpenAI (uploads)
async function startEvaluation(
  attemptId: string,
  answerText: string | null,
  question: { questionText: string; subject: string; marks: number; paper: string },
  fileUrl: string | null
) {
  console.log(`[Evaluation] Starting AI evaluation for attempt: ${attemptId}`);
  // Run evaluation asynchronously (don't block the response)
  evaluateAnswer(attemptId, answerText, {
    questionText: question.questionText,
    subject: question.subject,
    marks: question.marks,
    paper: question.paper,
  }, fileUrl)
    .then(async () => {
      // Send email notification on completion
      try {
        const attempt = await prisma.mainsAttempt.findUnique({
          where: { id: attemptId },
          include: { evaluation: true, user: true },
        });
        if (attempt?.evaluation && attempt.user) {
          await sendEvaluationComplete(
            attempt.user.email,
            attempt.user.firstName || "Aspirant",
            attempt.evaluation.score,
            attempt.evaluation.maxScore
          );
        }
      } catch (err) {
        console.error("Email notification error:", err);
      }
    })
    .catch((err) => console.error("Evaluation error:", err));
}
