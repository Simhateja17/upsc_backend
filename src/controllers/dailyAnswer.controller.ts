import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import { evaluateAnswer } from "../services/answerEvaluator";
import { sendEvaluationComplete } from "../services/emailService";
import { buildStoragePath, getSignedUrl, uploadFile, STORAGE_BUCKETS } from "../config/storage";
import { ensureTodayMainsQuestion, getTodayInAppTimeZone } from "../jobs/dailyContentJob";

function getToday(): Date {
  return getTodayInAppTimeZone();
}

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolves the target question date from ?date=, defaulting to today.
 * Returns null if the param is malformed or refers to a future date.
 */
function resolveDate(req: Request): Date | null {
  const raw = req.query.date;
  if (raw === undefined) return getToday();
  const parsed = parseDateParam(raw);
  if (!parsed) return null;
  if (parsed.getTime() > getToday().getTime()) return null;
  return parsed;
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

function getUploadedAnswerFiles(req: Request): Express.Multer.File[] {
  const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
  return [
    ...(req.file ? [req.file] : []),
    ...(filesByField.file || []),
    ...(filesByField.files || []),
  ];
}

/**
 * GET /api/daily-answer/today
 * Today's mains question metadata
 */
export const getTodayQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = getToday();
    await ensureTodayMainsQuestion();
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
    const targetDate = resolveDate(req);
    if (!targetDate) {
      return res.status(400).json({ status: "error", message: "Invalid or future date" });
    }
    if (req.query.date === undefined) {
      await ensureTodayMainsQuestion();
    }

    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: targetDate } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    const attemptCount = await prisma.mainsAttempt.count({ where: { questionId: question.id } });

    let attempted = false;
    let attemptId: string | null = null;
    let evaluationStatus: string | null = null;
    let score: number | null = null;
    let maxScore: number | null = null;

    if (req.user) {
      const attempt = await prisma.mainsAttempt.findUnique({
        where: { userId_questionId: { userId: req.user.id, questionId: question.id } },
        include: { evaluation: true },
      });
      if (attempt) {
        attempted = !!attempt.submittedAt;
        attemptId = attempt.id;
        evaluationStatus = attempt.evaluation?.status || null;
        score = attempt.evaluation?.score ?? null;
        maxScore = attempt.evaluation?.maxScore ?? null;
      }
    }

    res.json({
      status: "success",
      data: { ...question, attemptCount, attempted, attemptId, evaluationStatus, score, maxScore },
    });
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

    const targetDate = resolveDate(req);
    if (!targetDate) {
      return res.status(400).json({ status: "error", message: "Invalid or future date" });
    }
    if (req.query.date === undefined) {
      await ensureTodayMainsQuestion();
    }

    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: targetDate } });

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
    const targetDate = resolveDate(req);
    if (!targetDate) {
      return res.status(400).json({ status: "error", message: "Invalid or future date" });
    }
    if (req.query.date === undefined) {
      await ensureTodayMainsQuestion();
    }

    const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: targetDate } });

    if (!question) {
      return res.status(404).json({ status: "error", message: "No mains question for today" });
    }

    let fileUrl: string | null = null;

    // Handle file upload via multer
    const uploadedFiles = getUploadedAnswerFiles(req);
    if (uploadedFiles.length > 0) {
      const storedPaths: string[] = [];
      for (let index = 0; index < uploadedFiles.length; index++) {
        const file = uploadedFiles[index];
        const fileName = buildStoragePath(
          userId,
          "daily",
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

    let attempt;
    if (typeof req.query.attemptId === "string") {
      attempt = await prisma.mainsAttempt.findUnique({
        where: { id: req.query.attemptId },
        include: { evaluation: true },
      });
      if (!attempt || attempt.userId !== userId) {
        return res.status(404).json({ status: "error", message: "No attempt found" });
      }
    } else {
      const targetDate = resolveDate(req);
      if (!targetDate) {
        return res.status(400).json({ status: "error", message: "Invalid or future date" });
      }
      if (req.query.date === undefined) {
        await ensureTodayMainsQuestion();
      }

      const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: targetDate } });
      if (!question) {
        return res.status(404).json({ status: "error", message: "No mains question for today" });
      }

      attempt = await prisma.mainsAttempt.findUnique({
        where: { userId_questionId: { userId, questionId: question.id } },
        include: { evaluation: true },
      });

      if (!attempt) {
        return res.status(404).json({ status: "error", message: "No attempt found" });
      }
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

    let attempt;
    if (typeof req.query.attemptId === "string") {
      attempt = await prisma.mainsAttempt.findUnique({
        where: { id: req.query.attemptId },
        include: { evaluation: true, question: true },
      });
      if (!attempt || attempt.userId !== userId) {
        return res.status(404).json({ status: "error", message: "No evaluation results found" });
      }
    } else {
      const targetDate = resolveDate(req);
      if (!targetDate) {
        return res.status(400).json({ status: "error", message: "Invalid or future date" });
      }
      if (req.query.date === undefined) {
        await ensureTodayMainsQuestion();
      }

      const question = await prisma.dailyMainsQuestion.findUnique({ where: { date: targetDate } });
      if (!question) {
        return res.status(404).json({ status: "error", message: "No mains question for today" });
      }

      attempt = await prisma.mainsAttempt.findUnique({
        where: { userId_questionId: { userId, questionId: question.id } },
        include: { evaluation: true, question: true },
      });
    }

    if (!attempt || !attempt.evaluation) {
      return res.status(404).json({ status: "error", message: "No evaluation results found" });
    }

    const checkedCopyUrl = await signedCheckedCopyUrl(attempt.evaluation.checkedCopyUrl);
    const checkedCopyPages = await signedCheckedCopyPages(attempt.evaluation.checkedCopyPages);

    res.json({
      status: "success",
      data: {
        question: {
          title: attempt.question.title,
          subject: attempt.question.subject,
          paper: attempt.question.paper,
          date: attempt.question.date,
          marks: attempt.question.marks,
          wordLimit: attempt.question.wordLimit,
          timeLimit: attempt.question.timeLimit,
        },
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
        keyTerms: attempt.evaluation.keyTerms,
        nextAttemptFocus: attempt.evaluation.nextAttemptFocus,
        evaluatorConclusion: attempt.evaluation.evaluatorConclusion,
        modelAnswerKeyPoints: attempt.evaluation.modelAnswerKeyPoints,
        modelAnswerContent: attempt.evaluation.modelAnswerContent,
        parameterScores: attempt.evaluation.parameterScores,
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

/**
 * GET /api/daily-answer/calendar
 * Paginated list of past daily mains questions with the user's attempt status.
 * Query: from, to (YYYY-MM-DD, default to last 180 days up to today), page, limit (default 10, max 31)
 */
export const getCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const to = parseDateParam(req.query.to) || getToday();
    const defaultFrom = new Date(to);
    defaultFrom.setDate(defaultFrom.getDate() - 180);
    const from = parseDateParam(req.query.from) || defaultFrom;

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 31);
    const skip = (page - 1) * limit;

    const where = { date: { gte: from, lte: to }, isActive: true };

    const [questions, total] = await Promise.all([
      prisma.dailyMainsQuestion.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        select: { id: true, date: true, title: true, paper: true, subject: true, marks: true },
      }),
      prisma.dailyMainsQuestion.count({ where }),
    ]);

    const questionIds = questions.map((q) => q.id);
    const attempts = await prisma.mainsAttempt.findMany({
      where: { userId, questionId: { in: questionIds } },
      include: { evaluation: { select: { score: true, maxScore: true, status: true } } },
    });
    const attemptByQuestion = new Map(attempts.map((a) => [a.questionId, a]));

    const items = questions.map((q) => {
      const attempt = attemptByQuestion.get(q.id);
      return {
        date: q.date.toISOString().split("T")[0],
        title: q.title,
        paper: q.paper,
        subject: q.subject,
        marks: q.marks,
        attempted: !!attempt?.submittedAt,
        score: attempt?.evaluation?.score ?? null,
        maxScore: attempt?.evaluation?.maxScore ?? null,
        evaluationStatus: attempt?.evaluation?.status ?? null,
      };
    });

    res.json({ status: "success", data: { items, total, page, limit } });
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
