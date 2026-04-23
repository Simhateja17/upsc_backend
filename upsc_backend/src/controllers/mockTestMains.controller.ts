import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  evaluateAnswerGeneric,
  EvaluationDbOps,
} from "../services/answerEvaluator";
import { uploadFile, STORAGE_BUCKETS } from "../config/storage";

function buildDbOps(attemptId: string): EvaluationDbOps {
  return {
    markEvaluating: async (maxScore) => {
      await prisma.mockTestMainsEvaluation.upsert({
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
      await prisma.mockTestMainsAttempt.update({
        where: { id: attemptId },
        data: { answerText: text, wordCount },
      });
    },
    saveEvaluation: async (update) => {
      await prisma.mockTestMainsEvaluation.update({
        where: { attemptId },
        data: update,
      });
    },
  };
}

function deriveMarks(totalMarks: number, questionCount: number): number {
  if (!questionCount || questionCount <= 0) return 15;
  return Math.max(5, Math.round(totalMarks / questionCount));
}

async function kickoffEvaluation(
  attemptId: string,
  answerText: string | null,
  fileUrl: string | null,
  question: { questionText: string; subject: string },
  paper: string,
  marks: number
) {
  evaluateAnswerGeneric({
    attemptId,
    answerText,
    fileUrl,
    question: {
      questionText: question.questionText,
      subject: question.subject,
      paper,
      marks,
    },
    dbOps: buildDbOps(attemptId),
  });
}

/**
 * POST /api/mock-tests/:testId/mains-submit
 * Body: { mockTestQuestionId, answerText? } or multipart with `file`
 */
export const submitMockTestMainsAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const rawQId = req.body?.mockTestQuestionId;
    const mockTestQuestionId: string | undefined =
      typeof rawQId === "string" ? rawQId : undefined;

    if (!mockTestQuestionId) {
      return res.status(400).json({
        status: "error",
        message: "mockTestQuestionId is required",
      });
    }

    const mockTest = await prisma.mockTest.findUnique({
      where: { id: testId },
    });
    if (!mockTest) {
      return res
        .status(404)
        .json({ status: "error", message: "Mock test not found" });
    }

    const question = await prisma.mockTestQuestion.findUnique({
      where: { id: mockTestQuestionId },
    });
    if (!question || question.mockTestId !== testId) {
      return res
        .status(404)
        .json({ status: "error", message: "Mock test question not found" });
    }

    const rawAnswer = req.body?.answerText;
    const answerText: string | undefined =
      typeof rawAnswer === "string" ? rawAnswer : undefined;
    let fileUrl: string | null = null;

    if (req.file) {
      const fileName = `${userId}/mock-test/${Date.now()}_${req.file.originalname}`;
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

    const attempt = await prisma.mockTestMainsAttempt.create({
      data: {
        userId,
        mockTestId: testId,
        mockTestQuestionId,
        answerText: answerText || null,
        fileUrl,
        wordCount,
        submittedAt: new Date(),
      },
    });

    const marks = deriveMarks(mockTest.totalMarks, mockTest.questionCount);
    const paper = mockTest.paperType || "GS";

    kickoffEvaluation(
      attempt.id,
      answerText || null,
      fileUrl,
      { questionText: question.questionText, subject: question.subject },
      paper,
      marks
    );

    await prisma.userActivity.create({
      data: {
        userId,
        type: "mock_test",
        title: "Submitted Mock Test Mains Answer",
        description: `${mockTest.title} - ${question.subject}`,
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
 * GET /api/mock-tests/:testId/mains-evaluation-status?attemptId=...
 */
export const getMockTestMainsEvaluationStatus = async (
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

    const attempt = await prisma.mockTestMainsAttempt.findUnique({
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
 * GET /api/mock-tests/:testId/mains-results?attemptId=...
 */
export const getMockTestMainsResults = async (
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

    const attempt = await prisma.mockTestMainsAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true, question: true, mockTest: true },
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
        question: {
          id: attempt.question.id,
          questionText: attempt.question.questionText,
          subject: attempt.question.subject,
        },
        mockTest: {
          id: attempt.mockTest.id,
          title: attempt.mockTest.title,
          paperType: attempt.mockTest.paperType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
