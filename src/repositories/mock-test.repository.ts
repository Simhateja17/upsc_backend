export interface MockTestRepository {
  getSubjectCounts(): Promise<Map<string, number>>;
  getPlatformStats(): Promise<{ questionsCount: number; testsCount: number; usersCount: number }>;
  createTest(data: any): Promise<any>;
  deleteTest(id: string): Promise<void>;
  insertQuestions(questions: any[]): Promise<void>;
  findTest(testId: string): Promise<any>;
  findQuestions(testId: string): Promise<any[]>;
  insertAttempt(data: any): Promise<any>;
  findAttempt(userId: string, testId: string, completed?: boolean): Promise<any>;
  upsertDraft(userId: string, testId: string, answers: any): Promise<void>;
  insertActivity(data: any): Promise<void>;
  getStreak(userId: string): Promise<number>;
  countUserAttemptsToday(userId: string): Promise<number>;
  findPYQMains(subject?: string, paperType?: string, limit?: number): Promise<any[]>;
  findPYQQuestions(subject?: string, excludeSubjects?: string[], limit?: number): Promise<any[]>;
}
