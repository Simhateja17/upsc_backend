/**
 * UserRepository — seam for user profile and streak data access.
 */
export interface UserRepository {
  getStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; weekActivity: boolean[] }>;
  getActivity(userId: string, limit: number): Promise<any[]>;
}

import prisma from "../config/database";
import type { UserRepository as IUserRepository } from "./user.repository";
import { getDerivedStudyStreak } from "../services/streak.service";

export function createPrismaUserRepository(): IUserRepository {
  return {
    async getStreak(userId) {
      return getDerivedStudyStreak(userId);
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
