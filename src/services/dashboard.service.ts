import { dashboardRepo } from "../repositories/prisma-dashboard.repository";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDERED_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getIsoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function getDailyDummyRank(): number {
  const now = new Date();
  const daySeed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  const hash = ((daySeed * 9301 + 49297) % 233280) / 233280;
  return Math.floor(670 + hash * (810 - 670 + 1));
}

/** Compute days remaining until UPSC Prelims 2026 (June 2). */
export function computeDaysRemaining(): number {
  const prelimsDate = new Date(2026, 5, 2);
  return Math.max(0, Math.ceil((prelimsDate.getTime() - Date.now()) / 86400000));
}

/** Build the dashboard today snapshot response. */
export async function getDashboard(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snap = await dashboardRepo.getTodaySnapshot(userId, today);
  const daysRemaining = computeDaysRemaining();

  const trio = {
    mcq: {
      status: snap.todayMcqAttempted ? "completed" : snap.todayMcq ? "pending" : "unavailable",
      topic: snap.todayMcq?.title || "Daily MCQ Challenge",
      questionCount: snap.todayMcq?.questionCount || 10,
    },
    editorial: {
      status: snap.todayEditorialRead ? "completed" : snap.todayEditorial ? "pending" : "unavailable",
      topic: snap.todayEditorial?.title || "Current Affairs",
    },
    mains: {
      status: snap.todayMainsAttempted ? "completed" : snap.todayMains ? "pending" : "unavailable",
      topic: snap.todayMains?.subject || "Answer Writing",
    },
  };

  return {
    daysRemaining,
    trio,
    todayTasksCount: snap.todayTasksCount,
    recentActivity: snap.recentActivity,
    streak: snap.streak,
  };
}

/** Build the aggregated performance metrics response. */
export async function getPerformance(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raw = await dashboardRepo.getPerformanceRaw(userId, today);
  const seriesList = raw.seriesAttempts.data as Array<{ score: number | null; total: number | null }>;

  // Topic strength from recent MCQ attempts
  const topicStrength: Record<string, { correct: number; total: number }> = {};
  for (const attempt of raw.recentMcqAttempts) {
    for (const topic of attempt.strongTopics || []) {
      if (!topicStrength[topic]) topicStrength[topic] = { correct: 0, total: 0 };
      topicStrength[topic].correct++;
      topicStrength[topic].total++;
    }
    for (const topic of attempt.weakTopics || []) {
      if (!topicStrength[topic]) topicStrength[topic] = { correct: 0, total: 0 };
      topicStrength[topic].total++;
    }
  }

  const sortedTopics = Object.entries(topicStrength)
    .map(([name, { correct, total }]) => ({ name, accuracy: total > 0 ? (correct / total) * 100 : 0 }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const strongTopics = sortedTopics.slice(0, 5);
  const weakTopics = sortedTopics.slice(-5).reverse();

  const estimatedMinutes = raw.todayActivitiesCount * 15;
  const studyHours = Math.floor(estimatedMinutes / 60);
  const studyMinutes = estimatedMinutes % 60;
  const studyTimeToday = `${studyHours}h ${studyMinutes}m`;

  const testsTaken =
    raw.mcqAgg._count.id + raw.mockCount + raw.mockMainsCount + raw.pyqMainsCount + raw.mainsCount + raw.seriesAttempts.count;

  const mcqQuestions =
    (raw.mcqAgg._sum.correctCount ?? 0) + (raw.mcqAgg._sum.wrongCount ?? 0) + (raw.mcqAgg._sum.skippedCount ?? 0);
  const mockPrelimsQuestions =
    (raw.mockAgg._sum.correctCount ?? 0) + (raw.mockAgg._sum.wrongCount ?? 0) + (raw.mockAgg._sum.skippedCount ?? 0);
  const seriesQuestions = seriesList.reduce((s, a) => s + (a.total ?? 0), 0);
  const mainsQuestions = raw.mainsCount + raw.mockMainsCount + raw.pyqMainsCount;
  const questionsAttempted = mcqQuestions + mockPrelimsQuestions + seriesQuestions + mainsQuestions;

  const rank = raw.mcqAgg._max.rank ?? getDailyDummyRank();
  const rankPercentile = raw.mcqAgg._max.percentile ?? null;

  const totalCovered = raw.syllabusCoverage.reduce((s, c) => s + c.coveredTopics, 0);
  const totalTopics = raw.syllabusCoverage.reduce((s, c) => s + c.totalTopics, 0);
  const syllabusCoverage = totalTopics > 0 ? Math.round((totalCovered / totalTopics) * 100) : 0;

  return {
    studyTimeToday,
    testsTaken,
    questionsAttempted,
    rank,
    rankPercentile,
    jeetCoins: 0,
    syllabusCoverage,
    mcq: {
      totalAttempts: raw.mcqAgg._count.id,
      totalCorrect: raw.mcqAgg._sum.correctCount ?? 0,
      totalWrong: raw.mcqAgg._sum.wrongCount ?? 0,
      totalSkipped: raw.mcqAgg._sum.skippedCount ?? 0,
      avgAccuracy: Math.round((raw.mcqAgg._avg.accuracy ?? 0) * 10) / 10,
      avgTimePerQuestion: Math.round(raw.mcqAgg._avg.timeTaken ?? 0),
      bestPercentile: raw.mcqAgg._max.percentile ?? 0,
    },
    mains: {
      totalAttempts: raw.mainsCount + raw.mockMainsCount + raw.pyqMainsCount,
      dailyAnswerAttempts: raw.mainsCount,
      mockTestMainsAttempts: raw.mockMainsCount,
      pyqMainsAttempts: raw.pyqMainsCount,
    },
    mockTests: { totalAttempts: raw.mockCount },
    testSeries: { totalAttempts: raw.seriesAttempts.count },
    streak: raw.streak || { currentStreak: 0, longestStreak: 0 },
    strongTopics,
    weakTopics,
  };
}

/** Build the comprehensive test analytics response. */
export async function getTestAnalytics(userId: string) {
  const raw = await dashboardRepo.getTestAnalyticsRaw(userId);

  // Resolve test-series metadata
  const seriesAttempts = raw.seriesAttempts.data;
  const testIds = Array.from(new Set(seriesAttempts.map((a: any) => a.test_id).filter(Boolean)));
  let testMap: Record<string, { title: string; seriesTitle: string; seriesId?: string }> = {};
  if (testIds.length > 0) {
    const meta = await dashboardRepo.getSeriesTestMetadata(testIds);
    testMap = meta.testMap;
  }

  // Weekly MCQ trend
  const weekMap: Record<string, number[]> = {};
  for (const attempt of raw.recentMcq) {
    const key = getIsoWeekKey(new Date(attempt.createdAt));
    if (!weekMap[key]) weekMap[key] = [];
    weekMap[key].push(attempt.accuracy);
  }
  const weekKeys = Object.keys(weekMap).sort().slice(-8);
  const weeklyMcqTrend = weekKeys.map((key, i) => ({
    week: `W${i + 1}`,
    score: Math.round(avg(weekMap[key]) * 10) / 10,
  }));

  // Daily activity (last 7 days)
  const now = new Date();
  const dailyMap: Record<string, { questions: number; time: number }> = {};
  for (const day of ORDERED_DAYS) dailyMap[day] = { questions: 0, time: 0 };
  for (const attempt of raw.recentMcq) {
    const d = new Date(attempt.createdAt);
    if (now.getTime() - d.getTime() < 7 * 86400000) {
      const key = DAY_NAMES[d.getDay()];
      const total = (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0) + (attempt.skippedCount ?? 0);
      if (dailyMap[key]) {
        dailyMap[key].questions += total;
        dailyMap[key].time += attempt.timeTaken ?? 0;
      }
    }
  }
  const dailyActivity = ORDERED_DAYS.map((day) => ({
    day,
    questionsAttempted: dailyMap[day].questions,
    hours: Math.round((dailyMap[day].time / 3600) * 10) / 10,
  }));

  // Subject accuracy from mock attempts
  const subjectMap: Record<string, { correct: number; wrong: number }> = {};
  for (const attempt of raw.mockAttempts) {
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

  // Mains trend (merged across 3 sources)
  type MainsPoint = { createdAt: Date; scorePct: number; score: number; maxScore: number; source: string };
  const mainsPoints: MainsPoint[] = [];

  for (const a of raw.mainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const max = a.evaluation.maxScore || 10;
    mainsPoints.push({
      createdAt: new Date(a.createdAt), source: "daily",
      scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      score: a.evaluation.score, maxScore: max,
    });
  }
  for (const a of raw.mockTestMainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const max = a.evaluation.maxScore || 15;
    mainsPoints.push({
      createdAt: new Date(a.createdAt), source: "mock",
      scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      score: a.evaluation.score, maxScore: max,
    });
  }
  for (const a of raw.pyqMainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const max = a.evaluation.maxScore || 15;
    mainsPoints.push({
      createdAt: new Date(a.createdAt), source: "pyq",
      scorePct: max > 0 ? (a.evaluation.score / max) * 100 : 0,
      score: a.evaluation.score, maxScore: max,
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
  const mainsScores = mainsTrend.map((t) => t.score);
  const mainsStats = {
    totalAnswers: raw.mainsAttempts.length + raw.mockTestMainsAttempts.length + raw.pyqMainsAttempts.length,
    evaluatedAnswers: mainsPoints.length,
    avgScore: mainsScores.length > 0 ? Math.round(avg(mainsScores) * 10) / 10 : 0,
    latestScore: mainsScores[mainsScores.length - 1] ?? 0,
    improvement: mainsScores.length >= 2 ? mainsScores[mainsScores.length - 1] - mainsScores[mainsScores.length - 2] : 0,
    breakdown: {
      dailyAnswer: raw.mainsAttempts.length,
      mockTestMains: raw.mockTestMainsAttempts.length,
      pyqMains: raw.pyqMainsAttempts.length,
    },
  };

  // Time per question daily
  const timePerQuestion = ORDERED_DAYS.map((day) => {
    const d = dailyMap[day];
    const avgSec = d.questions > 0 ? Math.round(d.time / d.questions) : 0;
    return { day, avgSeconds: avgSec };
  });

  // Test history (merged across 6 sources)
  const relDate = (d: Date) => {
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
  };

  const historyRows: any[] = [];

  for (const a of raw.recentMcq) {
    const createdAt = new Date(a.createdAt);
    historyRows.push({
      id: a.id, name: a.dailyMcq?.title || "Daily MCQ", series: "Daily MCQ",
      date: relDate(createdAt), score: `${a.score}/${a.totalMarks}`,
      accuracy: Math.round(a.accuracy), sortAt: createdAt.getTime(), rank: null, type: "daily-mcq",
    });
  }

  for (const a of raw.mainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const createdAt = new Date(a.createdAt);
    const max = a.evaluation.maxScore || 10;
    const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
    historyRows.push({
      id: a.id, name: a.question?.title || a.question?.subject || "Daily Answer Writing",
      series: "Daily Answer Writing", date: relDate(createdAt),
      score: `${a.evaluation.score}/${max}`, accuracy: pct, sortAt: createdAt.getTime(), rank: null,
      type: "daily-answer", routeParams: { attemptId: a.id },
    });
  }

  for (const a of raw.mockAttempts) {
    const createdAt = new Date(a.createdAt);
    historyRows.push({
      id: a.id, name: a.mockTest.title, series: a.mockTest.source ?? "Full Mock",
      date: relDate(createdAt), score: `${a.score}/${a.totalMarks}`,
      accuracy: Math.round(a.accuracy), sortAt: createdAt.getTime(), rank: null,
      type: "mock-prelims", routeParams: { testId: a.mockTest.id },
    });
  }

  for (const a of raw.mockTestMainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const createdAt = new Date(a.createdAt);
    const max = a.evaluation.maxScore || 15;
    const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
    historyRows.push({
      id: a.id, name: a.mockTest?.title || "Mains Mock Test", series: "Mock Test · Mains",
      date: relDate(createdAt), score: `${a.evaluation.score}/${max}`, accuracy: pct,
      sortAt: createdAt.getTime(), rank: null, type: "mock-mains", routeParams: { testId: a.mockTestId },
    });
  }

  for (const a of raw.pyqMainsAttempts) {
    if (!a.evaluation || a.evaluation.status !== "completed") continue;
    const createdAt = new Date(a.createdAt);
    const max = a.evaluation.maxScore || 15;
    const pct = max > 0 ? Math.round((a.evaluation.score / max) * 100) : 0;
    const q = a.mainsQuestion;
    historyRows.push({
      id: a.id, name: q ? `PYQ ${q.year} · ${q.subject}` : "PYQ Mains",
      series: q?.paper ? `PYQ · ${q.paper}` : "PYQ · Mains",
      date: relDate(createdAt), score: `${a.evaluation.score}/${max}`, accuracy: pct,
      sortAt: createdAt.getTime(), rank: null, type: "pyq-mains",
      routeParams: { questionId: a.pyqMainsQuestionId, attemptId: a.id },
    });
  }

  for (const a of seriesAttempts as any[]) {
    const submittedAt = a.submitted_at ? new Date(a.submitted_at) : new Date();
    const total = a.total || 0;
    const score = a.score || 0;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const meta = testMap[a.test_id] || { title: "Series Test", seriesTitle: "Test Series" };
    historyRows.push({
      id: a.id, name: meta.title, series: meta.seriesTitle,
      date: relDate(submittedAt), score: `${score}/${total}`, accuracy: pct,
      sortAt: submittedAt.getTime(), rank: null, type: "test-series",
      routeParams: { seriesId: meta.seriesId || "", testId: a.test_id || "" },
    });
  }

  historyRows.sort((a, b) => b.sortAt - a.sortAt);
  const testHistory = historyRows.slice(0, 30).map(({ sortAt, ...row }: any) => row);

  const mcqQuestions = (raw.mcqAgg._sum.correctCount ?? 0) + (raw.mcqAgg._sum.wrongCount ?? 0) + (raw.mcqAgg._sum.skippedCount ?? 0);
  const mockPrelimsQ = raw.mockAttempts.reduce((s: number, a: any) => s + (a.correctCount ?? 0) + (a.wrongCount ?? 0) + (a.skippedCount ?? 0), 0);
  const seriesQ = (seriesAttempts as any[]).reduce((s: number, a: any) => s + (a.total ?? 0), 0);
  const mainsQ = raw.mainsAttempts.length + raw.mockTestMainsAttempts.length + raw.pyqMainsAttempts.length;
  const totalQuestions = mcqQuestions + mockPrelimsQ + seriesQ + mainsQ;

  return {
    summary: {
      totalTests:
        raw.mockAttempts.length + raw.mockTestMainsAttempts.length + raw.pyqMainsAttempts.length +
        seriesAttempts.length + (raw.mcqAgg._count.id ?? 0) + raw.mainsAttempts.length,
      avgAccuracy: Math.round((raw.mcqAgg._avg.accuracy ?? 0) * 10) / 10,
      bestPercentile: raw.mcqAgg._max.percentile ?? 0,
      currentStreak: raw.streak?.currentStreak ?? 0,
      totalQuestions,
      mcqAttempts: raw.mcqAgg._count.id,
      mcqCorrect: raw.mcqAgg._sum.correctCount ?? 0,
      mcqWrong: raw.mcqAgg._sum.wrongCount ?? 0,
      mcqSkipped: raw.mcqAgg._sum.skippedCount ?? 0,
      breakdown: {
        dailyMcq: raw.mcqAgg._count.id ?? 0,
        dailyAnswer: raw.mainsAttempts.length,
        mockPrelims: raw.mockAttempts.length,
        mockMains: raw.mockTestMainsAttempts.length,
        pyqMains: raw.pyqMainsAttempts.length,
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
  };
}
