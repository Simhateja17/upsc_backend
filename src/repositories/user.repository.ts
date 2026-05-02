/**
 * UserRepository — seam for user data access.
 */
export interface UserRepository {
  getStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; weekActivity: boolean[] }>;
  getActivity(userId: string, limit?: number): Promise<any[]>;
}
