import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTasks, recentActivity, streak, todayMcq, todayEditorial, todayMains, mcqAttemptToday, mainsAttemptToday] = await Promise.all([
      prisma.studyPlanTask.count({ where: { userId, date: today, isCompleted: false } }),
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.dailyMCQ.findUnique({ where: { date: today }, select: { id: true, title: true, questions: { select: { id: true } } } }),
      prisma.editorial.findFirst({ where: { createdAt: { gte: today } }, select: { id: true, title: true } }),
      prisma.dailyMainsQuestion.findFirst({ where: { date: today }, select: { id: true, subject: true } }),
      prisma.mCQAttempt.findFirst({ where: { userId, createdAt: { gte: today } } }),
      prisma.mainsAttempt.findFirst({ where: { userId, createdAt: { gte: today } } }),
    ]);

    // Compute days remaining until UPSC Prelims 2026 (approx May 24, 2026)
    const prelimsDate = new Date(2026, 4, 24); // May 24, 2026
    const daysRemaining = Math.max(0, Math.ceil((prelimsDate.getTime() - Date.now()) / 86400000));

    // Today's trio status
    const trio = {
      mcq: {
        status: mcqAttemptToday ? 'completed' : (todayMcq ? 'available' : 'unavailable'),
        topic: todayMcq?.title || 'Daily MCQ Challenge',
        questionCount: todayMcq?.questions?.length || 10,
      },
      editorial: {
        status: todayEditorial ? 'available' : 'unavailable',
        topic: todayEditorial?.title || 'Current Affairs',
      },
      mains: {
        status: mainsAttemptToday ? 'completed' : (todayMains ? 'available' : 'unavailable'),
        topic: todayMains?.subject || 'Answer Writing',
      },
    };

    res.json({
      status: "success",
      data: {
        daysRemaining,
        trio,
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

    // Frontend expects weekDays (alias for weekActivity)
    const data = {
      ...streak,
      weekDays: streak.weekActivity,
    };
    res.json({ status: "success", data });
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      mcqAgg,
      recentMcqAttempts,
      mainsCount,
      mockCount,
      mockMainsCount,
      pyqMainsCount,
      streak,
      todayActivities,
      syllabusCov,
      seriesAttemptsRes,
    ] = await Promise.all([
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
      prisma.mockTestMainsAttempt.count({ where: { userId } }),
      prisma.pyqMainsAttempt.count({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userActivity.findMany({ where: { userId, createdAt: { gte: today } } }),
      prisma.syllabusCoverage.findMany({ where: { userId } }),
      supabaseAdmin
        .from("test_series_attempts")
        .select("id, score, total", { count: "exact" })
        .eq("user_id", userId),
    ]);
    const seriesAttemptsCount = seriesAttemptsRes.count ?? 0;
    const seriesAttemptsList = (seriesAttemptsRes.data ?? []) as Array<{ score: number | null; total: number | null }>;

    // Mock-test prelims question totals (correct+wrong+skipped across all attempts).
    const mockAgg = await prisma.mockTestAttempt.aggregate({
      where: { userId },
      _sum: { correctCount: true, wrongCount: true, skippedCount: true },
    });

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

    // Compute study time today from activity count (estimate ~15min per activity)
    const estimatedMinutes = todayActivities.length * 15;
    const studyHours = Math.floor(estimatedMinutes / 60);
    const studyMinutes = estimatedMinutes % 60;
    const studyTimeToday = `${studyHours}h ${studyMinutes}m`;

    // Total tests taken across every submitted source.
    const testsTaken =
      mcqAgg._count.id + mockCount + mockMainsCount + pyqMainsCount + mainsCount + seriesAttemptsCount;

    // Total questions attempted across every source.
    const mcqQuestions =
      (mcqAgg._sum.correctCount ?? 0) + (mcqAgg._sum.wrongCount ?? 0) + (mcqAgg._sum.skippedCount ?? 0);
    const mockPrelimsQuestions =
      (mockAgg._sum.correctCount ?? 0) + (mockAgg._sum.wrongCount ?? 0) + (mockAgg._sum.skippedCount ?? 0);
    const seriesQuestions = seriesAttemptsList.reduce((s, a) => s + (a.total ?? 0), 0);
    // Each mains attempt = 1 written answer.
    const mainsQuestions = mainsCount + mockMainsCount + pyqMainsCount;
    const questionsAttempted = mcqQuestions + mockPrelimsQuestions + seriesQuestions + mainsQuestions;

    // Rank — placeholder (could be computed from leaderboard later)
    const rank = null;
    const rankPercentile = mcqAgg._max.percentile ?? null;

    // Jeet coins — placeholder
    const jeetCoins = 0;

    // Syllabus coverage average
    const totalCovered = syllabusCov.reduce((s, c) => s + c.coveredTopics, 0);
    const totalTopics = syllabusCov.reduce((s, c) => s + c.totalTopics, 0);
    const syllabusCoverage = totalTopics > 0 ? Math.round((totalCovered / totalTopics) * 100) : 0;

    res.json({
      status: "success",
      data: {
        studyTimeToday,
        testsTaken,
        questionsAttempted,
        rank,
        rankPercentile,
        jeetCoins,
        syllabusCoverage,
        mcq: {
          totalAttempts: mcqAgg._count.id,
          totalCorrect: mcqAgg._sum.correctCount ?? 0,
          totalWrong: mcqAgg._sum.wrongCount ?? 0,
          totalSkipped: mcqAgg._sum.skippedCount ?? 0,
          avgAccuracy: Math.round((mcqAgg._avg.accuracy ?? 0) * 10) / 10,
          avgTimePerQuestion: Math.round(mcqAgg._avg.timeTaken ?? 0),
          bestPercentile: mcqAgg._max.percentile ?? 0,
        },
        mains: {
          totalAttempts: mainsCount + mockMainsCount + pyqMainsCount,
          dailyAnswerAttempts: mainsCount,
          mockTestMainsAttempts: mockMainsCount,
          pyqMainsAttempts: pyqMainsCount,
        },
        mockTests: { totalAttempts: mockCount },
        testSeries: { totalAttempts: seriesAttemptsCount },
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

    const [
      mcqAgg,
      recentMcq,
      mockAttempts,
      mainsAttempts,
      mockTestMainsAttempts,
      pyqMainsAttempts,
      streak,
      seriesAttemptsRes,
    ] = await Promise.all([
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
        select: {
          id: true,
          score: true,
          totalMarks: true,
          accuracy: true,
          timeTaken: true,
          correctCount: true,
          wrongCount: true,
          skippedCount: true,
          createdAt: true,
          dailyMcq: { select: { title: true } },
        },
      }),
      prisma.mockTestAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { mockTest: { select: { id: true, title: true, source: true } } },
      }),
      prisma.mainsAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
          evaluation: { select: { score: true, maxScore: true, status: true } },
          question: { select: { title: true, subject: true } },
        },
      }),
      prisma.mockTestMainsAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
          evaluation: { select: { score: true, maxScore: true, status: true } },
          mockTest: { select: { title: true } },
        },
      }),
      prisma.pyqMainsAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
          evaluation: { select: { score: true, maxScore: true, status: true } },
          mainsQuestion: { select: { subject: true, paper: true, year: true } },
        },
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
      supabaseAdmin
        .from("test_series_attempts")
        .select("id, test_id, score, total, submitted_at, time_taken_seconds")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);

    // Resolve test-series titles for any attempts we found.
    const seriesAttempts = seriesAttemptsRes.data ?? [];
    const seriesTestIds = Array.from(new Set(seriesAttempts.map((a: any) => a.test_id).filter(Boolean)));
    let seriesTestTitleMap: Record<string, { title: string; seriesTitle: string; seriesId?: string }> = {};
    if (seriesTestIds.length > 0) {
      const { data: testRows } = await supabaseAdmin
        .from("test_series_tests")
        .select("id, title, series_id")
        .in("id", seriesTestIds);
      const seriesIds = Array.from(new Set((testRows || []).map((t: any) => t.series_id).filter(Boolean)));
      let seriesTitleById: Record<string, string> = {};
      if (seriesIds.length > 0) {
        const { data: seriesRows } = await supabaseAdmin
          .from("test_series")
          .select("id, title")
          .in("id", seriesIds);
        for (const s of seriesRows || []) seriesTitleById[s.id] = s.title;
      }
      for (const t of testRows || []) {
        seriesTestTitleMap[t.id] = {
          title: t.title || "Series Test",
          seriesTitle: seriesTitleById[t.series_id] || "Test Series",
          seriesId: t.series_id,
        };
      }
    }

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

    // --- Mains trend (merged across Daily Answer + Mock Test Mains + PYQ Mains) ---
    type MainsPoint = {
      source: "daily" | "mock" | "pyq";
      createdAt: Date;
      score: number;
      maxScore: number;
      scorePct: number;
    };
    const mainsPoints: MainsPoint[] = [];
    for (const a of mainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const max = a.evaluation.maxScore || 10;
      mainsPoints.push({
        source: "daily",
        createdAt: new Date(a.createdAt),
        score: a.evaluation.score,
        maxScore: max,
        scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      });
    }
    for (const a of mockTestMainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const max = a.evaluation.maxScore || 15;
      mainsPoints.push({
        source: "mock",
        createdAt: new Date(a.createdAt),
        score: a.evaluation.score,
        maxScore: max,
        scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      });
    }
    for (const a of pyqMainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const max = a.evaluation.maxScore || 15;
      mainsPoints.push({
        source: "pyq",
        createdAt: new Date(a.createdAt),
        score: a.evaluation.score,
        maxScore: max,
        scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      });
    }
    mainsPoints.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const mainsTrend = mainsPoints.map((p, i) => ({
      attempt: `T${i + 1}`,
      score: Math.round(p.scorePct * 10) / 10,
      rawScore: p.score,
      maxScore: p.maxScore,
      source: p.source,
    }));
    const mainsScores = mainsTrend.map(t => t.score);
    const totalMainsAttempts =
      mainsAttempts.length + mockTestMainsAttempts.length + pyqMainsAttempts.length;
    const mainsStats = {
      totalAnswers: totalMainsAttempts,
      evaluatedAnswers: mainsPoints.length,
      avgScore: mainsScores.length > 0 ? Math.round(avg(mainsScores) * 10) / 10 : 0,
      latestScore: mainsScores[mainsScores.length - 1] ?? 0,
      improvement: mainsScores.length >= 2 ? (mainsScores[mainsScores.length - 1] - mainsScores[mainsScores.length - 2]) : 0,
      breakdown: {
        dailyAnswer: mainsAttempts.length,
        mockTestMains: mockTestMainsAttempts.length,
        pyqMains: pyqMainsAttempts.length,
      },
    };

    // --- Time per question daily ---
    const timePerQuestion = ORDERED_DAYS.map(day => {
      const d = dailyMap[day];
      const avgSec = d.questions > 0 ? Math.round(d.time / d.questions) : 0;
      return { day, avgSeconds: avgSec };
    });

    const relDate = (d: Date) => {
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      return diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    };

    // --- Test history (merged: daily mcq + daily answer + mock prelims + mock mains + pyq mains + test series) ---
    const historyRows: Array<{
      id: string;
      name: string;
      series: string;
      date: string;
      score: string;
      accuracy: number;
      sortAt: number;
      rank: null;
      type: 'daily-mcq' | 'daily-answer' | 'mock-prelims' | 'mock-mains' | 'pyq-mains' | 'test-series';
      routeParams?: Record<string, string>;
    }> = [];

    for (const a of recentMcq) {
      const createdAt = new Date(a.createdAt);
      historyRows.push({
        id: a.id,
        name: a.dailyMcq?.title || 'Daily MCQ',
        series: 'Daily MCQ',
        date: relDate(createdAt),
        score: `${a.score}/${a.totalMarks}`,
        accuracy: Math.round(a.accuracy),
        sortAt: createdAt.getTime(),
        rank: null,
        type: 'daily-mcq',
      });
    }

    for (const a of mainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const createdAt = new Date(a.createdAt);
      const max = a.evaluation.maxScore || 10;
      const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
      historyRows.push({
        id: a.id,
        name: a.question?.title || a.question?.subject || 'Daily Answer Writing',
        series: 'Daily Answer Writing',
        date: relDate(createdAt),
        score: `${a.evaluation.score}/${max}`,
        accuracy: pct,
        sortAt: createdAt.getTime(),
        rank: null,
        type: 'daily-answer',
        routeParams: { attemptId: a.id },
      });
    }

    for (const a of mockAttempts) {
      const createdAt = new Date(a.createdAt);
      historyRows.push({
        id: a.id,
        name: a.mockTest.title,
        series: a.mockTest.source ?? 'Full Mock',
        date: relDate(createdAt),
        score: `${a.score}/${a.totalMarks}`,
        accuracy: Math.round(a.accuracy),
        sortAt: createdAt.getTime(),
        rank: null,
        type: 'mock-prelims',
        routeParams: { testId: a.mockTest.id },
      });
    }

    for (const a of mockTestMainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const createdAt = new Date(a.createdAt);
      const max = a.evaluation.maxScore || 15;
      const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
      historyRows.push({
        id: a.id,
        name: a.mockTest?.title || 'Mains Mock Test',
        series: 'Mock Test · Mains',
        date: relDate(createdAt),
        score: `${a.evaluation.score}/${max}`,
        accuracy: pct,
        sortAt: createdAt.getTime(),
        rank: null,
        type: 'mock-mains',
        routeParams: { testId: a.mockTestId },
      });
    }

    for (const a of pyqMainsAttempts) {
      if (!a.evaluation || a.evaluation.status !== "completed") continue;
      const createdAt = new Date(a.createdAt);
      const max = a.evaluation.maxScore || 15;
      const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
      const q = a.mainsQuestion;
      historyRows.push({
        id: a.id,
        name: q ? `PYQ ${q.year} · ${q.subject}` : 'PYQ Mains',
        series: q?.paper ? `PYQ · ${q.paper}` : 'PYQ · Mains',
        date: relDate(createdAt),
        score: `${a.evaluation.score}/${max}`,
        accuracy: pct,
        sortAt: createdAt.getTime(),
        rank: null,
        type: 'pyq-mains',
        routeParams: { questionId: a.pyqMainsQuestionId, attemptId: a.id },
      });
    }

    for (const a of seriesAttempts as any[]) {
      const submittedAt = a.submitted_at ? new Date(a.submitted_at) : new Date();
      const total = a.total || 0;
      const score = a.score || 0;
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      const meta = seriesTestTitleMap[a.test_id] || { title: 'Series Test', seriesTitle: 'Test Series' };
      historyRows.push({
        id: a.id,
        name: meta.title,
        series: meta.seriesTitle,
        date: relDate(submittedAt),
        score: `${score}/${total}`,
        accuracy: pct,
        sortAt: submittedAt.getTime(),
        rank: null,
        type: 'test-series',
        routeParams: { seriesId: meta.seriesId || '', testId: a.test_id || '' },
      });
    }

    historyRows.sort((a, b) => b.sortAt - a.sortAt);
    const testHistory = historyRows.slice(0, 30).map(({ sortAt, ...row }) => row);

    // Aggregate questions across every source, not just daily MCQs.
    const mcqQuestions = (mcqAgg._sum.correctCount ?? 0) + (mcqAgg._sum.wrongCount ?? 0) + (mcqAgg._sum.skippedCount ?? 0);
    const mockPrelimsQuestions = mockAttempts.reduce(
      (s, a) => s + (a.correctCount ?? 0) + (a.wrongCount ?? 0) + (a.skippedCount ?? 0),
      0,
    );
    const seriesQuestions = (seriesAttempts as any[]).reduce((s, a) => s + (a.total ?? 0), 0);
    const mainsQuestions = mainsAttempts.length + mockTestMainsAttempts.length + pyqMainsAttempts.length;
    const totalQuestions = mcqQuestions + mockPrelimsQuestions + seriesQuestions + mainsQuestions;

    res.json({
      status: 'success',
      data: {
        summary: {
          totalTests:
            mockAttempts.length +
            mockTestMainsAttempts.length +
            pyqMainsAttempts.length +
            seriesAttempts.length +
            (mcqAgg._count.id ?? 0) +
            mainsAttempts.length,
          avgAccuracy: Math.round((mcqAgg._avg.accuracy ?? 0) * 10) / 10,
          bestPercentile: mcqAgg._max.percentile ?? 0,
          currentStreak: streak?.currentStreak ?? 0,
          totalQuestions,
          mcqAttempts: mcqAgg._count.id,
          mcqCorrect: mcqAgg._sum.correctCount ?? 0,
          mcqWrong: mcqAgg._sum.wrongCount ?? 0,
          mcqSkipped: mcqAgg._sum.skippedCount ?? 0,
          breakdown: {
            dailyMcq: mcqAgg._count.id ?? 0,
            dailyAnswer: mainsAttempts.length,
            mockPrelims: mockAttempts.length,
            mockMains: mockTestMainsAttempts.length,
            pyqMains: pyqMainsAttempts.length,
            testSeries: seriesAttempts.length,
          },
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
