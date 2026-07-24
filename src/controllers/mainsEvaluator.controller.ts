import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  evaluateAnswerGeneric,
  EvaluationDbOps,
} from "../services/answerEvaluator";
import { buildStoragePath, getSignedUrl, uploadFile, STORAGE_BUCKETS } from "../config/storage";

const DEFAULT_PAPER = "GS Paper III";
const DEFAULT_SUBJECT = "General Studies";
const DEFAULT_MARKS = 15;

function uploadedAnswerFiles(req: Request): Express.Multer.File[] {
  const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
  return [
    ...(req.file ? [req.file] : []),
    ...(filesByField.file || []),
    ...(filesByField.files || []),
  ];
}

function normalizeMarks(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_MARKS;
  return Math.max(1, Math.min(50, Math.round(parsed)));
}

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
  question: { questionText: string; paper: string; subject: string; marks: number }
) {
  evaluateAnswerGeneric({
    attemptId,
    answerText,
    fileUrl,
    question,
    dbOps: buildDbOps(attemptId),
    evaluationMode: "custom",
  });
}

export const submitMainsEvaluatorAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const questionText =
      typeof req.body?.questionText === "string" ? req.body.questionText.trim() : "";
    const answerText =
      typeof req.body?.answerText === "string" ? req.body.answerText.trim() : "";
    const paper =
      typeof req.body?.paper === "string" && req.body.paper.trim()
        ? req.body.paper.trim()
        : DEFAULT_PAPER;
    const subject =
      typeof req.body?.subject === "string" && req.body.subject.trim()
        ? req.body.subject.trim()
        : DEFAULT_SUBJECT;
    const marks = normalizeMarks(req.body?.marks);

    if (!questionText) {
      return res.status(400).json({
        status: "error",
        message: "Please enter the question for standalone Mains evaluation.",
      });
    }

    const uploadedFiles = uploadedAnswerFiles(req);
    if (uploadedFiles.length > 1 && uploadedFiles.some((file) => file.mimetype === "application/pdf")) {
      return res.status(400).json({
        status: "error",
        message: "Upload either one PDF or multiple image pages, not multiple PDFs.",
      });
    }

    let fileUrl: string | null = null;
    if (uploadedFiles.length > 0) {
      const storedPaths: string[] = [];
      for (const [index, file] of uploadedFiles.entries()) {
        const fileName = buildStoragePath(
          userId,
          "mains-evaluator",
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

    if (!fileUrl && !answerText) {
      return res.status(400).json({
        status: "error",
        message: "Provide either answerText or a file upload",
      });
    }

    const customQuestion = await prisma.pYQMainsQuestion.create({
      data: {
        year: new Date().getFullYear(),
        paper,
        subject,
        questionText,
        topic: "Standalone Mains Evaluator",
        difficulty: "Medium",
        status: "custom",
        sourceFile: "mains-answer-evaluator",
      },
    });

    const wordCount = answerText
      ? answerText.split(/\s+/).filter(Boolean).length
      : 0;

    const attempt = await prisma.pyqMainsAttempt.create({
      data: {
        userId,
        pyqMainsQuestionId: customQuestion.id,
        answerText: answerText || null,
        fileUrl,
        wordCount,
        submittedAt: new Date(),
      },
    });

    kickoffEvaluation(attempt.id, answerText || null, fileUrl, {
      questionText,
      paper,
      subject,
      marks,
    });

    res.status(202).json({
      status: "success",
      data: {
        attemptId: attempt.id,
        status: "evaluating",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMainsEvaluatorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const attemptId =
      typeof req.query.attemptId === "string" ? req.query.attemptId : "";
    if (!attemptId) {
      return res.status(400).json({ status: "error", message: "attemptId is required" });
    }

    const attempt = await prisma.pyqMainsAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true, mainsQuestion: true },
    });
    if (!attempt || attempt.userId !== userId || attempt.mainsQuestion?.status !== "custom") {
      return res.status(404).json({ status: "error", message: "Attempt not found" });
    }

    const status = attempt.evaluation?.status || "pending";
    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        evaluationStatus: status,
        isComplete: status === "completed" || status === "failed",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMainsEvaluatorResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const attemptId =
      typeof req.query.attemptId === "string" ? req.query.attemptId : "";
    if (!attemptId) {
      return res.status(400).json({ status: "error", message: "attemptId is required" });
    }

    const attempt = await prisma.pyqMainsAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true, mainsQuestion: true },
    });
    if (!attempt || attempt.userId !== userId || attempt.mainsQuestion?.status !== "custom") {
      return res.status(404).json({ status: "error", message: "Attempt not found" });
    }
    if (!attempt.evaluation) {
      return res.status(404).json({ status: "error", message: "No evaluation results found" });
    }

    const checkedCopyUrl = await signedCheckedCopyUrl(attempt.evaluation.checkedCopyUrl);
    const checkedCopyPages = await signedCheckedCopyPages(attempt.evaluation.checkedCopyPages);

    res.json({
      status: "success",
      data: {
        score: attempt.evaluation.score,
        maxScore: attempt.evaluation.maxScore,
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
        modelAnswerStructure: attempt.evaluation.modelAnswerStructure,
        parameterScores: attempt.evaluation.parameterScores,
        wordCount: attempt.wordCount,
        submittedAt: attempt.submittedAt,
        answerText: attempt.answerText,
        question: {
          id: attempt.mainsQuestion.id,
          title: "Standalone Mains Evaluation",
          questionText: attempt.mainsQuestion.questionText,
          paper: attempt.mainsQuestion.paper,
          subject: attempt.mainsQuestion.subject,
          date: attempt.submittedAt,
          marks: attempt.evaluation.maxScore,
          wordLimit: attempt.evaluation.maxScore <= 10 ? 150 : 250,
          timeLimit: attempt.evaluation.maxScore <= 10 ? 7 : 11,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
