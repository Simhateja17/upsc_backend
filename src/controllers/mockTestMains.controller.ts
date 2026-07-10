import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  evaluateAnswerGeneric,
  EvaluationDbOps,
} from "../services/answerEvaluator";
import { buildStoragePath, getSignedUrl, uploadFile, STORAGE_BUCKETS } from "../config/storage";
import { notifyAnswerEvaluated } from "../utils/notifications";

async function signedCheckedCopyUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  return getSignedUrl(STORAGE_BUCKETS.CHECKED_COPIES, path, 3600);
}

async function signedCheckedCopyPages(pages: unknown): Promise<any[]> {
  if (!Array.isArray(pages)) return [];
  return Promise.all(
    pages.map(async (page: any) => ({
      ...page,
      checkedCopyUrl: page?.storagePath
        ? await signedCheckedCopyUrl(String(page.storagePath))
        : null,
    }))
  );
}

function getUploadedAnswerFiles(req: Request): Express.Multer.File[] {
  const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
  return [
    ...(req.file ? [req.file] : []),
    ...(filesByField.file || []),
    ...(filesByField.files || []),
  ];
}

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

      if (update.status === "completed") {
        try {
          const attempt = await prisma.mockTestMainsAttempt.findUnique({
            where: { id: attemptId },
            include: { user: true },
          });
          if (attempt?.user) {
            await notifyAnswerEvaluated({
              userId: attempt.user.id,
              score: update.score,
              maxScore: update.maxScore,
            });
          }
        } catch (err) {
          // Notification failure is non-critical
        }
      }
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
    evaluationMode: "mock",
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

    const uploadedFiles = getUploadedAnswerFiles(req);
    if (uploadedFiles.length > 0) {
      const storedPaths: string[] = [];
      for (let index = 0; index < uploadedFiles.length; index++) {
        const file = uploadedFiles[index];
        const fileName = buildStoragePath(
          userId,
          "mock-test",
          testId,
          mockTestQuestionId,
          `${Date.now()}_${String(index + 1).padStart(2, "0")}_${file.originalname}`
        );
        await uploadFile(
          STORAGE_BUCKETS.ANSWER_UPLOADS,
          fileName,
          file.buffer,
          file.mimetype
        );
        storedPaths.push(fileName);
      }
      fileUrl = storedPaths.length === 1 ? storedPaths[0] : JSON.stringify(storedPaths);
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

    const checkedCopyUrl = await signedCheckedCopyUrl(attempt.evaluation.checkedCopyUrl);
    const checkedCopyPages = await signedCheckedCopyPages(attempt.evaluation.checkedCopyPages);

    res.json({
      status: "success",
      data: {
        score: attempt.evaluation.score,
        maxScore: attempt.evaluation.maxScore,
        metrics: attempt.evaluation.metrics,
        strengths: attempt.evaluation.strengths,
        improvements: attempt.evaluation.improvements,
        suggestions: attempt.evaluation.suggestions,
        detailedFeedback: attempt.evaluation.detailedFeedback,
        demandCoverage: attempt.evaluation.demandCoverage,
        sectionFeedback: attempt.evaluation.sectionFeedback,
        annotationPlan: attempt.evaluation.annotationPlan,
        checkedCopyUrl,
        checkedCopyPages,
        checkedCopyPath: attempt.evaluation.checkedCopyUrl,
        checkedCopyStatus: attempt.evaluation.checkedCopyStatus,
        ragDiagnostics: attempt.evaluation.ragDiagnostics,
        modelAnswer: attempt.evaluation.modelAnswer,
        keyTerms: attempt.evaluation.keyTerms,
        nextAttemptFocus: attempt.evaluation.nextAttemptFocus,
        evaluatorConclusion: attempt.evaluation.evaluatorConclusion,
        modelAnswerKeyPoints: attempt.evaluation.modelAnswerKeyPoints,
        modelAnswerContent: attempt.evaluation.modelAnswerContent,
        parameterScores: attempt.evaluation.parameterScores,
        wordCount: attempt.wordCount,
        submittedAt: attempt.submittedAt,
        answerText: attempt.answerText,
        question: {
          id: attempt.question.id,
          questionText: attempt.question.questionText,
          subject: attempt.question.subject,
          paper: attempt.mockTest.paperType,
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

/**
 * GET /api/mock-tests/mains-history?limit=...
 */
export const getMainsHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const attempts = await prisma.mockTestMainsAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: limit,
      include: {
        question: { select: { questionText: true, subject: true } },
        mockTest: { select: { title: true, paperType: true } },
        evaluation: { select: { score: true, maxScore: true, status: true } },
      },
    });

    const history = attempts
      .filter((attempt) => attempt.evaluation?.status === "completed")
      .map((attempt) => ({
        attemptId: attempt.id,
        date: attempt.submittedAt,
        questionText: attempt.question.questionText,
        subject: attempt.question.subject,
        paper: attempt.mockTest.paperType,
        score: attempt.evaluation!.score,
        maxScore: attempt.evaluation!.maxScore,
        wordCount: attempt.wordCount,
      }));

    res.json({ status: "success", data: { attempts: history } });
  } catch (error) {
    next(error);
  }
};
