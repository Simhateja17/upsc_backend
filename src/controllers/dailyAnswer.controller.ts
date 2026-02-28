import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

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

    // Start evaluation (simulated AI evaluation)
    await startEvaluation(attempt.id, answerText, question);

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

    // In a real app, handle file upload with multer/Supabase storage
    // For now, accept a fileUrl from the client
    const { fileUrl } = req.body;

    const attempt = await prisma.mainsAttempt.upsert({
      where: { userId_questionId: { userId, questionId: question.id } },
      create: { userId, questionId: question.id, fileUrl, submittedAt: new Date() },
      update: { fileUrl, submittedAt: new Date() },
    });

    await startEvaluation(attempt.id, null, question);

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

// Simulated AI evaluation (in production, call an AI service)
async function startEvaluation(attemptId: string, answerText: string | null, question: any) {
  // Create evaluation record in "evaluating" state
  const evaluation = await prisma.mainsEvaluation.upsert({
    where: { attemptId },
    create: {
      attemptId,
      score: 0,
      maxScore: question.marks,
      status: "evaluating",
      strengths: [],
      improvements: [],
      suggestions: [],
    },
    update: { status: "evaluating" },
  });

  // Simulate async evaluation (in production, use a queue/worker)
  setTimeout(async () => {
    try {
      const score = answerText ? Math.min(question.marks, Math.max(3, Math.round(Math.random() * question.marks * 0.6 + question.marks * 0.3))) : question.marks * 0.5;

      await prisma.mainsEvaluation.update({
        where: { id: evaluation.id },
        data: {
          score,
          status: "completed",
          strengths: [
            "Good understanding of the core concept",
            "Well-structured argument with logical flow",
            "Relevant examples cited",
          ],
          improvements: [
            "Could include more recent case studies",
            "Introduction could be more impactful",
            "Add a stronger conclusion",
          ],
          suggestions: [
            "Reference constitutional provisions directly",
            "Include a diagram or flowchart where applicable",
            "Cite committee recommendations (e.g., Sarkaria Commission)",
          ],
          detailedFeedback: "Your answer demonstrates a solid grasp of the subject. The structure follows a logical progression. To improve further, focus on making your introduction more engaging and your conclusion more decisive.",
          evaluatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Evaluation error:", err);
    }
  }, 5000); // 5 second simulated delay
}
