export interface DailyMCQRepository {
  findTodayMCQ(): Promise<any>;
  createTodayMCQ(): Promise<void>;
  findTodayWithQuestions(): Promise<any>;
  checkUserAttempt(userId: string, mcqId: string): Promise<{ completedAt: Date | null } | null>;
  findQuestions(mcqId: string, includeAnswers?: boolean): Promise<any[]>;
  upsertAttempt(data: any): Promise<any>;
  upsertResponse(data: any): Promise<void>;
  createActivity(data: any): Promise<void>;
  getOrCreateStreak(userId: string, weekActivity: boolean[]): Promise<void>;
  updateStreak(userId: string, newStreak: number, longest: number, today: Date, weekActivity: boolean[]): Promise<void>;
  findAttempt(userId: string, mcqId: string): Promise<any>;
  countHigherScores(mcqId: string, score: number): Promise<number>;
  countTotalAttempts(mcqId: string): Promise<number>;
  findAttemptWithResponses(userId: string, mcqId: string): Promise<any>;
  findLatestAttempt(userId: string): Promise<any>;
  findQuestionsByTopics(topics: string[], cutoff: Date, limit: number): Promise<any[]>;
}
