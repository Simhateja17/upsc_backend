/**
 * UserRepository — seam for user profile and streak data access.
 */
export interface UserRepository {
  getStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; weekActivity: boolean[] }>;
  getActivity(userId: string, limit: number): Promise<any[]>;
}

import prisma from "../config/database";
import type { UserRepository as IUserRepository } from "./user.repository";

export function createPrismaUserRepository(): IUserRepository {
  return {
    async getStreak(userId) {
      let streak = await prisma.userStreak.findUnique({ where: { userId } });
      if (!streak) {
        streak = await prisma.userStreak.create({
          data: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            weekActivity: [false, false, false, false, false, false, false],
          },
        });
      }
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        weekActivity: streak.weekActivity as boolean[],
      };
    },

    async getActivity(userId, limit = 10) {
      return prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    },
  };
}

export const userRepo = createPrismaUserRepository();
