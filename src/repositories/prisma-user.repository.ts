/**
 * UserRepository — seam for user profile and streak data access.
 */
export interface UserRepository {
  getStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; weekActivity: boolean[] }>;
  getActivity(userId: string, limit: number): Promise<any[]>;
}

import prisma from "../config/database";
import type { UserRepository as IUserRepository } from "./user.repository";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function deriveCurrentWeekActivity(currentStreak: number, lastActiveDate?: Date | null, stored?: unknown): boolean[] {
  const today = getToday();
  const lastActive = lastActiveDate ? new Date(lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  const activity = Array.isArray(stored) && stored.length === 7
    ? stored.map(Boolean)
    : [false, false, false, false, false, false, false];

  if (!lastActive || getWeekStart(lastActive).getTime() !== getWeekStart(today).getTime()) {
    return activity;
  }

  const weekStart = getWeekStart(today);
  const daysToMark = Math.max(0, currentStreak);
  for (let offset = 0; offset < daysToMark; offset++) {
    const d = new Date(lastActive);
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < weekStart.getTime()) break;
    activity[getMondayIndex(d)] = true;
  }
  return activity;
}

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
        weekActivity: deriveCurrentWeekActivity(streak.currentStreak, streak.lastActiveDate, streak.weekActivity),
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
