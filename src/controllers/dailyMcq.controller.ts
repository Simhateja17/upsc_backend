import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/daily-mcq/today
 * Today's MCQ challenge metadata
 */
export const getTodayMCQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = getToday();
    const mcq = await prisma.dailyMCQ.findUnique({
      where: { date: today },
      select: { id: true, title: true, topic: true, tags: true, questionCount: true, timeLimit: true, totalMarks: true },
    });

    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });
    }

    // Check if user already attempted
    let attempted = false;
    if (req.user) {
      const attempt = await prisma.mCQAttempt.findUnique({
        where: { userId_dailyMcqId: { userId: req.user.id, dailyMcqId: mcq.id } },
      });
      attempted = !!attempt?.completedAt;
    }

    res.json({ status: "success", data: { ...mcq, attempted } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-mcq/today/questions
 * Fetch all questions with options (no correct answers)
 */
export const getTodayQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = getToday();
    const mcq = await prisma.dailyMCQ.findUnique({
      where: { date: today },
      include: {
        questions: {
          orderBy: { questionNum: "asc" },
          select: { id: true, questionNum: true, questionText: true, category: true, difficulty: true, options: true },
        },
      },
    });

    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });
    }

    res.json({
      status: "success",
      data: {
        mcqId: mcq.id,
        timeLimit: mcq.timeLimit,
        totalMarks: mcq.totalMarks,
        questions: mcq.questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/daily-mcq/today/submit
 * Submit all answers: { answers: [{questionId, selectedOption}], timeTaken }
 */
export const submitMCQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { answers, timeTaken } = req.body;

    const today = getToday();
    const mcq = await prisma.dailyMCQ.findUnique({
      where: { date: today },
      include: { questions: true },
    });

    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });
    }

    // Check for existing attempt
    const existing = await prisma.mCQAttempt.findUnique({
      where: { userId_dailyMcqId: { userId, dailyMcqId: mcq.id } },
    });
    if (existing?.completedAt) {
      return res.status(400).json({ status: "error", message: "You have already submitted today's MCQ" });
    }

    // Build a question lookup
    const questionMap = new Map(mcq.questions.map(q => [q.id, q]));

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const topicResults: Record<string, { correct: number; total: number }> = {};
    const responseData: Array<{ questionId: string; selectedOption: string | null; isCorrect: boolean | null; timeTaken: number }> = [];

    for (const q of mcq.questions) {
      const answer = answers?.find((a: any) => a.questionId === q.id);
      const selected = answer?.selectedOption || null;
      const isCorrect = selected ? selected === q.correctOption : null;

      if (!selected) {
        skippedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      // Track topic performance
      if (!topicResults[q.category]) topicResults[q.category] = { correct: 0, total: 0 };
      topicResults[q.category].total++;
      if (isCorrect) topicResults[q.category].correct++;

      responseData.push({ questionId: q.id, selectedOption: selected, isCorrect, timeTaken: answer?.timeTaken || 0 });
    }

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
    const score = correctCount * (mcq.totalMarks / mcq.questionCount);

    // Determine strong/weak topics
    const strongTopics = Object.entries(topicResults)
      .filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.7)
      .map(([k]) => k);
    const weakTopics = Object.entries(topicResults)
      .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5)
      .map(([k]) => k);

    // Create or update attempt
    const attempt = await prisma.mCQAttempt.upsert({
      where: { userId_dailyMcqId: { userId, dailyMcqId: mcq.id } },
      create: {
        userId,
        dailyMcqId: mcq.id,
        score: Math.round(score * 10) / 10,
        totalMarks: mcq.totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy: Math.round(accuracy * 10) / 10,
        timeTaken: timeTaken || 0,
        strongTopics,
        weakTopics,
        completedAt: new Date(),
      },
      update: {
        score: Math.round(score * 10) / 10,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy: Math.round(accuracy * 10) / 10,
        timeTaken: timeTaken || 0,
        strongTopics,
        weakTopics,
        completedAt: new Date(),
      },
    });

    // Save individual responses
    for (const r of responseData) {
      await prisma.mCQResponse.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: r.questionId } },
        create: { attemptId: attempt.id, ...r },
        update: { selectedOption: r.selectedOption, isCorrect: r.isCorrect, timeTaken: r.timeTaken },
      });
    }

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        type: "mcq",
        title: "Completed Daily MCQ",
        description: `Scored ${correctCount}/${mcq.questionCount} (${Math.round(accuracy)}%)`,
      },
    });

    // Update streak
    await updateStreak(userId);

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy: attempt.accuracy,
        timeTaken: attempt.timeTaken,
        strongTopics,
        weakTopics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-mcq/today/results
 * User's results for today
 */
export const getTodayResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const mcq = await prisma.dailyMCQ.findUnique({ where: { date: today } });
    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ challenge for today" });
    }

    const attempt = await prisma.mCQAttempt.findUnique({
      where: { userId_dailyMcqId: { userId, dailyMcqId: mcq.id } },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found for today" });
    }

    // Calculate rank (simple: count how many scored higher)
    const higherCount = await prisma.mCQAttempt.count({
      where: { dailyMcqId: mcq.id, score: { gt: attempt.score } },
    });
    const totalAttempts = await prisma.mCQAttempt.count({ where: { dailyMcqId: mcq.id } });
    const rank = higherCount + 1;
    const percentile = totalAttempts > 0 ? ((totalAttempts - higherCount) / totalAttempts) * 100 : 0;

    res.json({
      status: "success",
      data: {
        ...attempt,
        rank,
        percentile: Math.round(percentile),
        totalParticipants: totalAttempts,
        questionCount: mcq.questionCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-mcq/today/review
 * Questions with user's answers, correct answers, and explanations
 */
export const getTodayReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const mcq = await prisma.dailyMCQ.findUnique({
      where: { date: today },
      include: { questions: { orderBy: { questionNum: "asc" } } },
    });

    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ challenge for today" });
    }

    const attempt = await prisma.mCQAttempt.findUnique({
      where: { userId_dailyMcqId: { userId, dailyMcqId: mcq.id } },
      include: { responses: true },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found" });
    }

    const responseMap = new Map(attempt.responses.map(r => [r.questionId, r]));

    const reviewData = mcq.questions.map(q => {
      const response = responseMap.get(q.id);
      return {
        id: q.id,
        questionNum: q.questionNum,
        questionText: q.questionText,
        category: q.category,
        difficulty: q.difficulty,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation,
        selectedOption: response?.selectedOption || null,
        isCorrect: response?.isCorrect || false,
      };
    });

    res.json({ status: "success", data: { questions: reviewData } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/daily-mcq/today/recommendations
 * Personalized next-step suggestions
 */
export const getTodayRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const mcq = await prisma.dailyMCQ.findUnique({ where: { date: today } });
    if (!mcq) {
      return res.status(404).json({ status: "error", message: "No MCQ for today" });
    }

    const attempt = await prisma.mCQAttempt.findUnique({
      where: { userId_dailyMcqId: { userId, dailyMcqId: mcq.id } },
    });

    // Generate recommendations based on performance
    const recommendations = [];

    if (attempt) {
      if (attempt.weakTopics.length > 0) {
        recommendations.push({
          type: "study",
          title: "Review Weak Areas",
          description: `Focus on: ${attempt.weakTopics.join(", ")}`,
          action: "Go to Study Material",
          link: "/dashboard/library",
        });
      }
      if (attempt.accuracy < 60) {
        recommendations.push({
          type: "practice",
          title: "Practice More MCQs",
          description: "Build your accuracy with subject-wise practice",
          action: "Start Mock Test",
          link: "/dashboard/mock-tests",
        });
      }
      recommendations.push({
        type: "editorial",
        title: "Read Today's Editorial",
        description: "Stay updated with current affairs analysis",
        action: "Read Editorials",
        link: "/dashboard/daily-editorial",
      });
      recommendations.push({
        type: "answer",
        title: "Practice Answer Writing",
        description: "Attempt today's mains question",
        action: "Write Answer",
        link: "/dashboard/daily-answer",
      });
    }

    res.json({ status: "success", data: { recommendations } });
  } catch (error) {
    next(error);
  }
};

// Helper: update user streak
async function updateStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak) {
    await prisma.userStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, weekActivity: getWeekActivity(today) },
    });
    return;
  }

  const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  const isToday = lastActive && lastActive.getTime() === today.getTime();
  if (isToday) return; // Already recorded today

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastActive && lastActive.getTime() === yesterday.getTime();

  const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(newStreak, streak.longestStreak);

  await prisma.userStreak.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: today, weekActivity: getWeekActivity(today) },
  });
}

function getWeekActivity(today: Date): boolean[] {
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const activity = [false, false, false, false, false, false, false];
  activity[mondayIndex] = true;
  return activity;
}
