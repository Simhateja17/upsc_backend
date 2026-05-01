import { Request, Response, NextFunction } from "express";
import { userRepo } from "../repositories/prisma-user.repository";
import { getDashboard, getPerformance, getTestAnalytics } from "../services/dashboard.service";

/**
 * GET /api/user/dashboard
 * Overall dashboard summary — delegates to DashboardService.
 */
export const getDashboardHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboard(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/streak
 */
export const getStreak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streak = await userRepo.getStreak(req.user!.id);
    res.json({ status: "success", data: { ...streak, weekDays: streak.weekActivity } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/activity
 */
export const getActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await userRepo.getActivity(req.user!.id, limit);
    res.json({ status: "success", data: activities });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/performance
 * Aggregated performance metrics — delegates to DashboardService.
 */
export const getPerformanceHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getPerformance(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/test-analytics
 * Comprehensive test analytics — delegates to DashboardService.
 */
export const getTestAnalyticsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getTestAnalytics(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
