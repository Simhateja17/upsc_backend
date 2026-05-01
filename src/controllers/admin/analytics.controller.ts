import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalMCQAttempts,
      totalMainsAttempts,
      totalMockAttempts,
      mcqAttemptsToday,
      totalEditorials,
      totalPYQs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.mCQAttempt.count(),
      prisma.mainsAttempt.count(),
      prisma.mockTestAttempt.count(),
      prisma.mCQAttempt.count({ where: { createdAt: { gte: today } } }),
      prisma.editorial.count(),
      prisma.pYQQuestion.count({ where: { status: "approved" } }),
    ]);

    res.json({
      status: "success",
      data: {
        users: { total: totalUsers, newToday: newUsersToday, newThisWeek: newUsersWeek },
        activity: {
          totalMCQAttempts,
          totalMainsAttempts,
          totalMockAttempts,
          mcqAttemptsToday,
        },
        content: {
          totalEditorials,
          approvedPYQs: totalPYQs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
