import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import { computeSyllabusCoverage } from "../utils/syllabusDedup";
import { istDateKey, istDayWindow } from "../utils/istDate";
import type {
  DashboardRepository,
  DashboardSnapshot,
  PerformanceRaw,
  TestAnalyticsRaw,
} from "./dashboard.repository";

export function createPrismaDashboardRepository(): DashboardRepository {
  return {
    async getTodaySnapshot(userId, today) {
      // Study-plan task `date` values can be stored at local midnight (server
      // default) or at noon UTC (when the client passes an explicit
      // "YYYY-MM-DD" string, per studyPlanner.controller.ts's parsePlannerDate).
      // An exact-equality match against local-midnight `today` misses the
      // noon-UTC ones, so use a same-day range instead.
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

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
        prisma.studyPlanTask.count({ where: { userId, date: { gte: today, lt: tomorrow }, isCompleted: false } }),
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
        prisma.mCQAttempt.findFirst({ where: { userId, dailyMcq: { date: today } } }),
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
      // See getTodaySnapshot above — same-day range instead of exact match,
      // to catch study-plan tasks dated at either local midnight or noon UTC.
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        mcqAgg,
        recentMcq,
        mainsCount,
        mockCount,
        mockMainsCount,
        pyqMainsCount,
        streak,
        todayCompletedStudyTasks,
        todayActivities,
        syllabusSubjects,
        trackerState,
        seriesRes,
        todayCompletedTasksRaw,
      ] =
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
          prisma.studyPlanTask.findMany({
            where: {
              userId,
              isCompleted: true,
              OR: [
                { completedAt: { gte: today } },
                { date: { gte: today } },
              ],
            },
            select: {
              duration: true,
              actualDuration: true,
              startTime: true,
              endTime: true,
            },
          }),
          prisma.userActivity.findMany({ where: { userId, createdAt: { gte: today } } }),
          prisma.syllabusSubject.findMany({
            orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
            include: {
              topics: {
                orderBy: { sortOrder: "asc" },
                include: { subTopics: { orderBy: { sortOrder: "asc" } } },
              },
            },
          }),
          prisma.syllabusTrackerState.findUnique({
            where: { userId },
            select: { states: true },
          }),
          supabaseAdmin
            .from("test_series_attempts")
            .select("id, score, total", { count: "exact" })
            .eq("user_id", userId),
          prisma.studyPlanTask.findMany({
            where: { userId, date: { gte: today, lt: tomorrow }, isCompleted: true },
            select: { actualDuration: true, duration: true, startTime: true, endTime: true },
          }),
        ]);

      const stateMap = (trackerState?.states ?? {}) as Record<string, { status?: string }>;
      // Dedup topics/sub-topics the same way the Syllabus Tracker page does
      // before counting, so this stat's percentage matches what the tracker
      // page shows for the same saved state (see src/utils/syllabusDedup.ts).
      const syllabusCov = syllabusSubjects.map((subject) => {
        const { totalTopics, coveredTopics } = computeSyllabusCoverage(subject.topics, subject.id, stateMap);
        return { subject: subject.name, coveredTopics, totalTopics };
      });

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
        todayCompletedStudyTasks,
        todayActivitiesCount: todayActivities.length,
        syllabusCoverage: syllabusCov,
        seriesAttempts: {
          count: seriesRes.count ?? 0,
          data: (seriesRes.data ?? []) as any[],
        },
        mockAgg,
        todayCompletedTasks: todayCompletedTasksRaw,
      };
    },

    async getTestAnalyticsRaw(userId) {
      const sevenDaysAgo = istDayWindow(istDateKey(new Date(), -6)).since;

      const [mcqAgg, recentMcq, mockAttempts, mainsAttempts, mockTestMainsAttempts, pyqMainsAttempts, completedStudyTasksLast7Days, streak, seriesRes, editorialReads] =
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
              dailyMcq: { select: { title: true, topic: true } },
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
          prisma.studyPlanTask.findMany({
            where: {
              userId,
              isCompleted: true,
              OR: [
                { completedAt: { gte: sevenDaysAgo } },
                { date: { gte: sevenDaysAgo } },
              ],
            },
            select: {
              title: true,
              description: true,
              type: true,
              date: true,
              duration: true,
              actualDuration: true,
              startTime: true,
              endTime: true,
              completedAt: true,
            },
          }),
          prisma.userStreak.findUnique({ where: { userId } }),
          supabaseAdmin
            .from("test_series_attempts")
            .select("id, test_id, score, total, submitted_at, time_taken_seconds")
            .eq("user_id", userId)
            .order("submitted_at", { ascending: false })
            .limit(20),
          prisma.editorialProgress.findMany({
            where: { userId, isRead: true, readAt: { gte: sevenDaysAgo } },
            select: { readAt: true },
          }),
        ]);

      return {
        mcqAgg,
        recentMcq,
        mockAttempts,
        mainsAttempts,
        mockTestMainsAttempts,
        pyqMainsAttempts,
        completedStudyTasksLast7Days,
        streak,
        seriesAttempts: { data: seriesRes.data ?? [] },
        editorialReadDatesLast7Days: editorialReads.map((e) => e.readAt as Date).filter(Boolean),
      };
    },

    async getMonthlyActivityRaw(userId, monthStart, monthEnd) {
      const [
        activities,
        mcqAttempts,
        mainsAttempts,
        mockAttempts,
        mockMainsAttempts,
        pyqMainsAttempts,
        completedTasks,
        editorials,
      ] = await Promise.all([
        prisma.userActivity.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.mCQAttempt.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.mainsAttempt.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.mockTestAttempt.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.mockTestMainsAttempt.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.pyqMainsAttempt.findMany({
          where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
          select: { createdAt: true },
        }),
        prisma.studyPlanTask.findMany({
          where: {
            userId,
            isCompleted: true,
            completedAt: { gte: monthStart, lt: monthEnd },
          },
          select: { completedAt: true, duration: true, actualDuration: true, startTime: true, endTime: true },
        }),
        prisma.editorial.findMany({
          where: { publishedAt: { gte: monthStart, lt: monthEnd } },
          select: {
            publishedAt: true,
            progress: { where: { userId, isRead: true }, select: { id: true } },
          },
        }),
      ]);

      return {
        activityDates: activities.map((a) => a.createdAt),
        mcqDates: mcqAttempts.map((a) => a.createdAt),
        mainsDates: mainsAttempts.map((a) => a.createdAt),
        mockDates: mockAttempts.map((a) => a.createdAt),
        mockMainsDates: mockMainsAttempts.map((a) => a.createdAt),
        pyqMainsDates: pyqMainsAttempts.map((a) => a.createdAt),
        editorials: editorials.map((e) => ({ publishedAt: e.publishedAt, readByUser: e.progress.length > 0 })),
        completedTasks,
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
