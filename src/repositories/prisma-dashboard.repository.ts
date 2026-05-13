import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import type {
  DashboardRepository,
  DashboardSnapshot,
  PerformanceRaw,
  TestAnalyticsRaw,
} from "./dashboard.repository";

export function createPrismaDashboardRepository(): DashboardRepository {
  return {
    async getTodaySnapshot(userId, today) {
      const [
        todayTasks,
        recentActivity,
        streak,
        todayMcqRaw,
        todayEditorial,
        todayMains,
        mcqAttemptToday,
        mainsAttemptToday,
        editorialReadToday,
      ] = await Promise.all([
        prisma.studyPlanTask.count({ where: { userId, date: today, isCompleted: false } }),
        prisma.userActivity.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.userStreak.findUnique({ where: { userId } }),
        prisma.dailyMCQ.findUnique({
          where: { date: today },
          select: { id: true, title: true, questions: { select: { id: true } } },
        }),
        prisma.editorial.findFirst({
          where: { createdAt: { gte: today } },
          select: { id: true, title: true },
        }),
        prisma.dailyMainsQuestion.findFirst({
          where: { date: today },
          select: { id: true, subject: true },
        }),
        prisma.mCQAttempt.findFirst({ where: { userId, createdAt: { gte: today } } }),
        prisma.mainsAttempt.findFirst({ where: { userId, createdAt: { gte: today } } }),
        prisma.editorialProgress.findFirst({ where: { userId, isRead: true, readAt: { gte: today } } }),
      ]);

      return {
        todayTasksCount: todayTasks,
        recentActivity,
        streak: streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, weekActivity: streak.weekActivity as boolean[] } : { currentStreak: 0, longestStreak: 0, weekActivity: [false, false, false, false, false, false, false] },
        todayMcq: todayMcqRaw ? { id: todayMcqRaw.id, title: todayMcqRaw.title, questionCount: todayMcqRaw.questions.length } : null,
        todayEditorial,
        todayMains: todayMains ? { id: todayMains.id, subject: todayMains.subject } : null,
        todayMcqAttempted: !!mcqAttemptToday,
        todayMainsAttempted: !!mainsAttemptToday,
        todayEditorialRead: !!editorialReadToday,
      };
    },

    async getPerformanceRaw(userId, today) {
      const [mcqAgg, recentMcq, mainsCount, mockCount, mockMainsCount, pyqMainsCount, streak, todayActivities, syllabusCov, seriesRes] =
        await Promise.all([
          prisma.mCQAttempt.aggregate({
            where: { userId },
            _count: { id: true },
            _sum: { correctCount: true, wrongCount: true, skippedCount: true },
            _avg: { accuracy: true, timeTaken: true },
            _max: { percentile: true, rank: true },
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

      const mockAgg = await prisma.mockTestAttempt.aggregate({
        where: { userId },
        _sum: { correctCount: true, wrongCount: true, skippedCount: true },
      });

      return {
        mcqAgg,
        recentMcqAttempts: recentMcq,
        mainsCount,
        mockCount,
        mockMainsCount,
        pyqMainsCount,
        streak,
        todayActivitiesCount: todayActivities.length,
        syllabusCoverage: syllabusCov,
        seriesAttempts: {
          count: seriesRes.count ?? 0,
          data: (seriesRes.data ?? []) as any[],
        },
        mockAgg,
      };
    },

    async getTestAnalyticsRaw(userId) {
      const [mcqAgg, recentMcq, mockAttempts, mainsAttempts, mockTestMainsAttempts, pyqMainsAttempts, streak, seriesRes] =
        await Promise.all([
          prisma.mCQAttempt.aggregate({
            where: { userId },
            _count: { id: true },
            _sum: { correctCount: true, wrongCount: true, skippedCount: true },
            _avg: { accuracy: true },
            _max: { percentile: true },
          }),
          prisma.mCQAttempt.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 56,
            select: {
              id: true, score: true, totalMarks: true, accuracy: true, timeTaken: true,
              correctCount: true, wrongCount: true, skippedCount: true, createdAt: true,
              dailyMcq: { select: { title: true, subject: true } },
            },
          }),
          prisma.mockTestAttempt.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { mockTest: { select: { id: true, title: true, source: true } } },
          }),
          prisma.mainsAttempt.findMany({
            where: { userId }, orderBy: { createdAt: "asc" },
            include: {
              evaluation: { select: { score: true, maxScore: true, status: true } },
              question: { select: { title: true, subject: true } },
            },
          }),
          prisma.mockTestMainsAttempt.findMany({
            where: { userId }, orderBy: { createdAt: "asc" },
            include: {
              evaluation: { select: { score: true, maxScore: true, status: true } },
              mockTest: { select: { title: true } },
            },
          }),
          prisma.pyqMainsAttempt.findMany({
            where: { userId }, orderBy: { createdAt: "asc" },
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

      return {
        mcqAgg,
        recentMcq,
        mockAttempts,
        mainsAttempts,
        mockTestMainsAttempts,
        pyqMainsAttempts,
        streak,
        seriesAttempts: { data: seriesRes.data ?? [] },
      };
    },

    async getSeriesTestMetadata(testIds) {
      const { data: testRows } = await supabaseAdmin
        .from("test_series_tests")
        .select("id, title, series_id")
        .in("id", testIds);

      const seriesIds = Array.from(
        new Set((testRows || []).map((t: any) => t.series_id).filter(Boolean))
      );
      let seriesTitleById: Record<string, string> = {};
      if (seriesIds.length > 0) {
        const { data: seriesRows } = await supabaseAdmin
          .from("test_series")
          .select("id, title")
          .in("id", seriesIds);
        for (const s of seriesRows || []) seriesTitleById[s.id] = s.title;
      }

      const testMap: Record<string, any> = {};
      for (const t of testRows || []) {
        testMap[t.id] = {
          title: t.title || "Series Test",
          seriesTitle: seriesTitleById[t.series_id] || "Test Series",
          seriesId: t.series_id,
        };
      }

      return { testMap };
    },
  };
}

export const dashboardRepo = createPrismaDashboardRepository();
