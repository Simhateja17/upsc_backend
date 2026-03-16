import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDERED_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getIsoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * GET /api/user/dashboard
 * Overall dashboard summary
 */
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    console.log(`[Dashboard] Fetching dashboard for user: ${userId}`);
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
    console.log(`[Dashboard] Fetching performance for user: ${userId}`);

    const [mcqAgg, recentMcqAttempts, mainsCount, mockCount, streak] = await Promise.all([
      prisma.mCQAttempt.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { correctCount: true, wrongCount: true, skippedCount: true },
        _avg: { accuracy: true, timeTaken: true },
        _max: { percentile: true },
      }),
      prisma.mCQAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.mainsAttempt.count({ where: { userId } }),
      prisma.mockTestAttempt.count({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    // Collect strong/weak topics from last 20 MCQ attempts
    const topicStrength: Record<string, { correct: number; total: number }> = {};
    for (const attempt of recentMcqAttempts) {
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

    res.json({
      status: "success",
      data: {
        mcq: {
          totalAttempts: mcqAgg._count.id,
          totalCorrect: mcqAgg._sum.correctCount ?? 0,
          totalWrong: mcqAgg._sum.wrongCount ?? 0,
          totalSkipped: mcqAgg._sum.skippedCount ?? 0,
          avgAccuracy: Math.round((mcqAgg._avg.accuracy ?? 0) * 10) / 10,
          avgTimePerQuestion: Math.round(mcqAgg._avg.timeTaken ?? 0),
          bestPercentile: mcqAgg._max.percentile ?? 0,
        },
        mains: { totalAttempts: mainsCount },
        mockTests: { totalAttempts: mockCount },
        streak: streak || { currentStreak: 0, longestStreak: 0 },
        strongTopics,
        weakTopics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/test-analytics
 * Comprehensive test analytics aggregation
 */
export const getTestAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [mcqAgg, recentMcq, mockAttempts, mainsAttempts, streak] = await Promise.all([
      prisma.mCQAttempt.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { correctCount: true, wrongCount: true, skippedCount: true },
        _avg: { accuracy: true },
        _max: { percentile: true },
      }),
      prisma.mCQAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 56,
        select: { accuracy: true, timeTaken: true, correctCount: true, wrongCount: true, skippedCount: true, createdAt: true },
      }),
      prisma.mockTestAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { mockTest: { select: { title: true, source: true } } },
      }),
      prisma.mainsAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: { evaluation: { select: { score: true } } },
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    // --- Weekly MCQ trend (last 8 ISO weeks) ---
    const weekMap: Record<string, number[]> = {};
    for (const attempt of recentMcq) {
      const key = getIsoWeekKey(new Date(attempt.createdAt));
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(attempt.accuracy);
    }
    const weekKeys = Object.keys(weekMap).sort().slice(-8);
    const weeklyMcqTrend = weekKeys.map((key, i) => ({
      week: `W${i + 1}`,
      score: Math.round(avg(weekMap[key]) * 10) / 10,
    }));

    // --- Daily activity (last 7 days) ---
    const now = new Date();
    const dailyMap: Record<string, { questions: number; time: number }> = {};
    for (const day of ORDERED_DAYS) dailyMap[day] = { questions: 0, time: 0 };

    for (const attempt of recentMcq) {
      const d = new Date(attempt.createdAt);
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 7 * 86400000) {
        const key = DAY_NAMES[d.getDay()];
        const total = (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0) + (attempt.skippedCount ?? 0);
        if (dailyMap[key]) {
          dailyMap[key].questions += total;
          dailyMap[key].time += attempt.timeTaken ?? 0;
        }
      }
    }
    const dailyActivity = ORDERED_DAYS.map(day => ({
      day,
      questionsAttempted: dailyMap[day].questions,
      hours: Math.round((dailyMap[day].time / 3600) * 10) / 10,
    }));

    // --- Subject accuracy from mockAttempts ---
    const subjectMap: Record<string, { correct: number; wrong: number }> = {};
    for (const attempt of mockAttempts) {
      if (!attempt.subjectWise) continue;
      for (const [subject, stats] of Object.entries(attempt.subjectWise as Record<string, { correct: number; wrong: number }>)) {
        if (!subjectMap[subject]) subjectMap[subject] = { correct: 0, wrong: 0 };
        subjectMap[subject].correct += stats.correct ?? 0;
        subjectMap[subject].wrong += stats.wrong ?? 0;
      }
    }
    const subjectAccuracy = Object.entries(subjectMap)
      .map(([subject, { correct, wrong }]) => ({
        subject,
        correct,
        wrong,
        accuracy: correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    // --- Mains trend ---
    const mainsTrend = mainsAttempts
      .filter(a => a.evaluation)
      .map((a, i) => ({ attempt: `T${i + 1}`, score: a.evaluation!.score }));
    const mainsScores = mainsTrend.map(t => t.score);
    const mainsStats = {
      totalAnswers: mainsAttempts.length,
      avgScore: mainsScores.length > 0 ? Math.round(avg(mainsScores) * 10) / 10 : 0,
      latestScore: mainsScores.at(-1) ?? 0,
      improvement: mainsScores.length >= 2 ? (mainsScores.at(-1)! - mainsScores.at(-2)!) : 0,
    };

    // --- Time per question daily ---
    const timePerQuestion = ORDERED_DAYS.map(day => {
      const d = dailyMap[day];
      const avgSec = d.questions > 0 ? Math.round(d.time / d.questions) : 0;
      return { day, avgSeconds: avgSec };
    });

    // --- Test history ---
    const testHistory = mockAttempts.map(a => {
      const createdAt = new Date(a.createdAt);
      const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
      const dateStr = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
      return {
        id: a.id,
        name: a.mockTest.title,
        series: a.mockTest.source ?? 'Full Mock',
        date: dateStr,
        score: `${a.score}/${a.totalMarks}`,
        accuracy: Math.round(a.accuracy),
        rank: null as null,
      };
    });

    const totalQuestions = (mcqAgg._sum.correctCount ?? 0) + (mcqAgg._sum.wrongCount ?? 0) + (mcqAgg._sum.skippedCount ?? 0);

    res.json({
      status: 'success',
      data: {
        summary: {
          totalTests: mockAttempts.length,
          avgAccuracy: Math.round((mcqAgg._avg.accuracy ?? 0) * 10) / 10,
          bestPercentile: mcqAgg._max.percentile ?? 0,
          currentStreak: streak?.currentStreak ?? 0,
          totalQuestions,
          mcqAttempts: mcqAgg._count.id,
          mcqCorrect: mcqAgg._sum.correctCount ?? 0,
          mcqWrong: mcqAgg._sum.wrongCount ?? 0,
          mcqSkipped: mcqAgg._sum.skippedCount ?? 0,
        },
        subjectAccuracy,
        weeklyMcqTrend,
        dailyActivity,
        mainsTrend,
        mainsStats,
        timePerQuestion,
        testHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};
