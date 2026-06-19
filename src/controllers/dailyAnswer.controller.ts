import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import { evaluateAnswer } from "../services/answerEvaluator";
import { sendEvaluationComplete } from "../services/emailService";
import { buildStoragePath, getSignedUrl, uploadFile, STORAGE_BUCKETS } from "../config/storage";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
    const today = getToday();
    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: today } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    let fileUrl: string | null = null;

    // Handle file upload via multer
    if (req.file) {
      const fileName = buildStoragePath(userId, `${Date.now()}_${req.file.originalname}`);
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

    const evalStatus = attempt.evaluation?.status || "pending";

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        evaluationStatus: evalStatus,
        // "completed" and "failed" are both terminal — the client should stop polling in either case.
        isComplete: evalStatus === "completed" || evalStatus === "failed",
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
        metrics: attempt.evaluation.metrics,
        demandCoverage: attempt.evaluation.demandCoverage,
        sectionFeedback: attempt.evaluation.sectionFeedback,
        annotationPlan: attempt.evaluation.annotationPlan,
        checkedCopyUrl,
        checkedCopyPages,
        checkedCopyPath: attempt.evaluation.checkedCopyUrl,
        checkedCopyStatus: attempt.evaluation.checkedCopyStatus,
        ragDiagnostics: attempt.evaluation.ragDiagnostics,
        modelAnswer: attempt.evaluation.modelAnswer,
        wordCount: attempt.wordCount,
        answerText: attempt.answerText,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-answer/history
 * Past mains attempts with their evaluation scores
 */
export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const attempts = await prisma.mainsAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: limit,
      include: {
        question: { select: { title: true, subject: true, paper: true, date: true } },
        evaluation: { select: { score: true, maxScore: true, status: true } },
      },
    });

    const history = attempts
      .filter((attempt) => attempt.evaluation?.status === "completed")
      .map((attempt) => ({
        attemptId: attempt.id,
        date: attempt.question.date,
        title: attempt.question.title,
        subject: attempt.question.subject,
        paper: attempt.question.paper,
        score: attempt.evaluation!.score,
        maxScore: attempt.evaluation!.maxScore,
        wordCount: attempt.wordCount,
        submittedAt: attempt.submittedAt,
      }));

    res.json({ status: "success", data: { attempts: history } });
  } catch (error) {
    next(error);
  }
};

// Real AI evaluation: typed answers go straight to the evaluator; uploads use
// Uploaded files are transcribed by the generic evaluator, then graded through the same path.
async function startEvaluation(
  attemptId: string,
  answerText: string | null,
  question: { questionText: string; subject: string; marks: number; paper: string },
  fileUrl: string | null
) {
  // Run evaluation asynchronously (don't block the response)
  evaluateAnswer(attemptId, answerText, {
    questionText: question.questionText,
    subject: question.subject,
    marks: question.marks,
    paper: question.paper,
  }, fileUrl)
    .then(async () => {
      try {
        const attempt = await prisma.mainsAttempt.findUnique({
          where: { id: attemptId },
          include: { evaluation: true, user: true },
        });
        if (!attempt?.evaluation) return;

        const user = attempt.user;
        if (!user) return;

        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("settings")
          .eq("id", user.id)
          .single();
        const answerPref = userData?.settings?.notifications?.answer ?? true;

        const score = attempt.evaluation.score;
        const maxScore = attempt.evaluation.maxScore;
        const firstName = user.firstName || "Aspirant";

        if (answerPref) {
          await supabaseAdmin.from("notifications").insert({
            user_id: user.id,
            title: `Answer Evaluated — Score: ${score}/${maxScore} ✅`,
            body: "Your mains answer has been evaluated. View detailed feedback, strengths, and suggestions.",
            type: "answer_evaluated",
            read: false,
          });

          if (user.email) {
            await sendEvaluationComplete(user.email, firstName, score, maxScore);
          }
        }
      } catch (err) {
        // Notification failure is non-critical
      }
    });
}
