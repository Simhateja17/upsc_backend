import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/user/dashboard
 * Overall dashboard summary
 */
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTasks, recentActivity, streak] = await Promise.all([
      prisma.studyPlanTask.count({ where: { userId, date: today, isCompleted: false } }),
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    res.json({
      status: "success",
      data: {
        todayTasksCount: todayTasks,
        recentActivity,
        streak: streak || { currentStreak: 0, longestStreak: 0, weekActivity: [false, false, false, false, false, false, false] },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/streak
 * Current study streak data
 */
export const getStreak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    let streak = await prisma.userStreak.findUnique({ where: { userId } });

    if (!streak) {
      streak = await prisma.userStreak.create({
        data: { userId, currentStreak: 0, longestStreak: 0, weekActivity: [false, false, false, false, false, false, false] },
      });
    }

    res.json({ status: "success", data: streak });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/activity
 * Recent activity feed
 */
export const getActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ status: "success", data: activities });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/performance
 * Aggregated performance metrics
 */
export const getPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [mcqAttempts, mainsAttempts, mockAttempts, streak] = await Promise.all([
      prisma.mCQAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.mainsAttempt.findMany({ where: { userId }, include: { evaluation: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.mockTestAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    // Calculate aggregate stats
    const totalMCQs = mcqAttempts.length;
    const avgAccuracy = totalMCQs > 0 ? mcqAttempts.reduce((sum, a) => sum + a.accuracy, 0) / totalMCQs : 0;
    const avgTimeMCQ = totalMCQs > 0 ? mcqAttempts.reduce((sum, a) => sum + a.timeTaken, 0) / totalMCQs : 0;
    const bestRank = mcqAttempts.reduce((best, a) => a.percentile && (!best || a.percentile > best) ? a.percentile : best, 0 as number);

    // Collect strong/weak topics from MCQ attempts
    const topicStrength: Record<string, { correct: number; total: number }> = {};
    for (const attempt of mcqAttempts) {
      for (const topic of attempt.strongTopics) {
        if (!topicStrength[topic]) topicStrength[topic] = { correct: 0, total: 0 };
        topicStrength[topic].correct++;
        topicStrength[topic].total++;
      }
      for (const topic of attempt.weakTopics) {
        if (!topicStrength[topic]) topicStrength[topic] = { correct: 0, total: 0 };
        topicStrength[topic].total++;
      }
    }

    const sortedTopics = Object.entries(topicStrength)
      .map(([name, { correct, total }]) => ({ name, accuracy: total > 0 ? (correct / total) * 100 : 0 }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const strongTopics = sortedTopics.slice(0, 5);
    const weakTopics = sortedTopics.slice(-5).reverse();

    // Mains average score
    const mainsScores = mainsAttempts
      .filter(a => a.evaluation)
      .map(a => a.evaluation!.score);
    const avgMainsScore = mainsScores.length > 0 ? mainsScores.reduce((a, b) => a + b, 0) / mainsScores.length : 0;

    res.json({
      status: "success",
      data: {
        mcq: { totalAttempts: totalMCQs, avgAccuracy: Math.round(avgAccuracy * 10) / 10, avgTimePerQuestion: Math.round(avgTimeMCQ), bestPercentile: bestRank },
        mains: { totalAttempts: mainsAttempts.length, avgScore: Math.round(avgMainsScore * 10) / 10 },
        mockTests: { totalAttempts: mockAttempts.length },
        streak: streak || { currentStreak: 0, longestStreak: 0 },
        strongTopics,
        weakTopics,
      },
    });
  } catch (error) {
    next(error);
  }
};
