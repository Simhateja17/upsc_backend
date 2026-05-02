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
  todayActivitiesCount: number;
  syllabusCoverage: { coveredTopics: number; totalTopics: number }[];
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
  streak: any;
  seriesAttempts: { data: any[] };
}

export interface DashboardRepository {
  getTodaySnapshot(userId: string, today: Date): Promise<DashboardSnapshot>;
  getPerformanceRaw(userId: string, today: Date): Promise<PerformanceRaw>;
  getTestAnalyticsRaw(userId: string): Promise<TestAnalyticsRaw>;
  getSeriesTestMetadata(testIds: string[]): Promise<{
    testMap: Record<string, { title: string; seriesTitle: string; seriesId?: string }>;
  }>;
}
