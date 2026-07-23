/**
 * DashboardRepository — seam for dashboard data access.
 * Abstracts all Prisma + Supabase queries used by the dashboard.
 */
export interface DashboardSnapshot {
  todayTasksCount: number;
  recentActivity: any[];
  streak: { currentStreak: number; longestStreak: number; weekActivity: boolean[] } | null;
  todayMcq: { id: string; title: string; questionCount: number } | null;
  todayEditorial: { id: string; title: string } | null;
  todayMains: { id: string; subject: string } | null;
  todayMcqAttempted: boolean;
  todayMainsAttempted: boolean;
  todayEditorialRead: boolean;
}

export interface PerformanceRaw {
  mcqAgg: {
    _count: { id: number };
    _sum: { correctCount: number | null; wrongCount: number | null; skippedCount: number | null };
    _avg: { accuracy: number | null; timeTaken: number | null };
    _max: { percentile: number | null; rank: number | null };
  };
  recentMcqAttempts: any[];
  mainsCount: number;
  mockCount: number;
  mockMainsCount: number;
  pyqMainsCount: number;
  streak: any;
  todayCompletedStudyTasks: Array<{
    duration: number | null;
    actualDuration: number | null;
    startTime: string | null;
    endTime: string | null;
  }>;
  todayActivitiesCount: number;
  todayCompletedTasks: Array<{ actualDuration: number | null; duration: number | null; startTime: string | null; endTime: string | null }>;
  syllabusCoverage: { subject: string; coveredTopics: number; totalTopics: number }[];
  seriesAttempts: { count: number; data: Array<{ score: number | null; total: number | null }> };
  mockAgg: { _sum: { correctCount: number | null; wrongCount: number | null; skippedCount: number | null } };
}

export interface TestAnalyticsRaw {
  mcqAgg: any;
  recentMcq: any[];
  mockAttempts: any[];
  mainsAttempts: any[];
  mockTestMainsAttempts: any[];
  pyqMainsAttempts: any[];
  completedStudyTasksLast7Days: Array<{
    title: string;
    description: string | null;
    type: string;
    date: Date;
    duration: number | null;
    actualDuration: number | null;
    startTime: string | null;
    endTime: string | null;
    completedAt: Date | null;
  }>;
  streak: any;
  seriesAttempts: { data: any[] };
  editorialReadDatesLast7Days: Date[];
}

export interface MonthlyActivityRaw {
  activityDates: Date[];
  mcqDates: Date[];
  mainsDates: Date[];
  mockDates: Date[];
  mockMainsDates: Date[];
  pyqMainsDates: Date[];
  /** Editorials published within the month, each flagged with whether this user has read it. */
  editorials: Array<{ publishedAt: Date; readByUser: boolean }>;
  completedTasks: Array<{
    completedAt: Date | null;
    duration: number | null;
    actualDuration: number | null;
    startTime: string | null;
    endTime: string | null;
  }>;
}

export interface DashboardRepository {
  getTodaySnapshot(userId: string, today: Date): Promise<DashboardSnapshot>;
  getPerformanceRaw(userId: string, today: Date): Promise<PerformanceRaw>;
  getTestAnalyticsRaw(userId: string): Promise<TestAnalyticsRaw>;
  getMonthlyActivityRaw(userId: string, monthStart: Date, monthEnd: Date): Promise<MonthlyActivityRaw>;
  getSeriesTestMetadata(testIds: string[]): Promise<{
    testMap: Record<string, { title: string; seriesTitle: string; seriesId?: string }>;
  }>;
}
