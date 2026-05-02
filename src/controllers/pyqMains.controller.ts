import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  evaluateAnswerGeneric,
  EvaluationDbOps,
} from "../services/answerEvaluator";
import { uploadFile, STORAGE_BUCKETS } from "../config/storage";

// PYQMainsQuestion has no `marks` column, so use the UPSC Mains convention:
// 15-mark answers ≈ 250 words, 10-mark answers ≈ 150 words. Default to 15.
const DEFAULT_MARKS = 15;

function buildDbOps(attemptId: string): EvaluationDbOps {
  return {
    markEvaluating: async (maxScore) => {
      await prisma.pyqMainsEvaluation.upsert({
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
        update: {
          status: "evaluating",
          score: 0,
          maxScore,
          strengths: [],
          improvements: [],
          suggestions: [],
          detailedFeedback: null,
          evaluatedAt: null,
        },
      });
    },
    saveAttemptText: async (text, wordCount) => {
      await prisma.pyqMainsAttempt.update({
        where: { id: attemptId },
        data: { answerText: text, wordCount },
      });
    },
    saveEvaluation: async (update) => {
      await prisma.pyqMainsEvaluation.update({
        where: { attemptId },
        data: update,
      });
    },
  };
}

async function kickoffEvaluation(
  attemptId: string,
  answerText: string | null,
  fileUrl: string | null,
  question: { questionText: string; subject: string; paper: string }
) {
  evaluateAnswerGeneric({
    attemptId,
    answerText,
    fileUrl,
    question: {
      questionText: question.questionText,
      subject: question.subject,
      paper: question.paper,
      marks: DEFAULT_MARKS,
    },
    dbOps: buildDbOps(attemptId),
  });
}

/**
 * POST /api/pyq/mains/:questionId/submit
 * Accepts typed answer (JSON { answerText }) OR file upload (multipart).
 */
export const submitPyqMainsAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const questionId = req.params.questionId as string;

    const question = await prisma.pYQMainsQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return res
        .status(404)
        .json({ status: "error", message: "PYQ mains question not found" });
    }

    const rawAnswer = req.body?.answerText;
    const answerText: string | undefined =
      typeof rawAnswer === "string" ? rawAnswer : undefined;
    let fileUrl: string | null = null;

    if (req.file) {
      const fileName = `${userId}/pyq/${Date.now()}_${req.file.originalname}`;
      await uploadFile(
        STORAGE_BUCKETS.ANSWER_UPLOADS,
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
      fileUrl = fileName;
    }

    if (!fileUrl && (!answerText || answerText.trim().length === 0)) {
      return res.status(400).json({
        status: "error",
        message: "Provide either answerText or a file upload",
      });
    }

    const wordCount = answerText
      ? answerText.trim().split(/\s+/).filter(Boolean).length
      : 0;

    const attempt = await prisma.pyqMainsAttempt.create({
      data: {
        userId,
        pyqMainsQuestionId: questionId,
        answerText: answerText || null,
        fileUrl,
        wordCount,
        submittedAt: new Date(),
      },
    });

    // Fire-and-forget
    kickoffEvaluation(attempt.id, answerText || null, fileUrl, {
      questionText: question.questionText,
      subject: question.subject,
      paper: question.paper,
    });

    await prisma.userActivity.create({
      data: {
        userId,
        type: "answer",
        title: "Submitted PYQ Mains Answer",
        description: `${question.paper} - ${question.subject}`,
      },
    });

    res.json({
      status: "success",
      data: { attemptId: attempt.id, status: "evaluating" },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pyq/mains/:questionId/evaluation-status?attemptId=...
 */
export const getPyqMainsEvaluationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const attemptId =
      typeof req.query.attemptId === "string" ? req.query.attemptId : "";
    if (!attemptId) {
      return res
        .status(400)
        .json({ status: "error", message: "attemptId is required" });
    }

    const attempt = await prisma.pyqMainsAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true },
    });
    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ status: "error", message: "Attempt not found" });
    }

    const status = attempt.evaluation?.status || "pending";
    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        evaluationStatus: status,
        // "completed" and "failed" are both terminal — the client should stop polling in either case.
        isComplete: status === "completed" || status === "failed",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pyq/mains/:questionId/results?attemptId=...
 */
export const getPyqMainsResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const attemptId =
      typeof req.query.attemptId === "string" ? req.query.attemptId : "";
    if (!attemptId) {
      return res
        .status(400)
        .json({ status: "error", message: "attemptId is required" });
    }

    const attempt = await prisma.pyqMainsAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true, mainsQuestion: true },
    });
    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ status: "error", message: "Attempt not found" });
    }
    if (!attempt.evaluation) {
      return res
        .status(404)
        .json({ status: "error", message: "No evaluation results found" });
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
        answerText: attempt.answerText,
        question: attempt.mainsQuestion ? {
          id: attempt.mainsQuestion!.id,
          questionText: attempt.mainsQuestion!.questionText,
          paper: attempt.mainsQuestion!.paper,
          subject: attempt.mainsQuestion!.subject,
          year: attempt.mainsQuestion!.year,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
