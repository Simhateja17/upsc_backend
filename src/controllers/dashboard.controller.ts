import { Request, Response, NextFunction } from "express";
import { userRepo } from "../repositories/prisma-user.repository";
import { getDashboard, getPerformance, getTestAnalytics, getBadges, getStreakCalendar } from "../services/dashboard.service";
import { getAchievements, markBadgesSeen } from "../services/badges/badgeService";

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

/**
 * GET /api/user/badges
 * Achievement badges — delegates to DashboardService.
 */
export const getBadgesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getBadges(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/achievements
 * Full achievement board — evaluates all badges against real activity, awards
 * newly-earned ones (persist + notify), and returns statuses, totals and stats.
 */
export const getAchievementsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAchievements(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/achievements/seen
 * Marks the given badge keys as seen so their toast fires only once.
 */
export const markBadgesSeenHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = Array.isArray(req.body?.keys) ? (req.body.keys as string[]) : [];
    await markBadgesSeen(req.user!.id, keys);
    res.json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/streak-calendar
 * Real per-day activity calendar for the current month — delegates to DashboardService.
 */
export const getStreakCalendarHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getStreakCalendar(req.user!.id);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
