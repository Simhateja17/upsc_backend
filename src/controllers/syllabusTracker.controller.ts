import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { getFeatureStatus } from "../services/entitlements.service";

function countTrackedItems(states: Record<string, unknown>) {
  return Object.values(states).filter((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const status = (value as { status?: string }).status;
    return !!status && status !== "not_started";
  }).length;
}

/**
 * GET /api/user/syllabus-tracker
 */
export const getTrackerState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await prisma.syllabusTrackerState.findUnique({
      where: { userId: req.user!.id },
    });

    res.json({
      status: "success",
      data: state
        ? { mode: state.mode, states: state.states }
        : { mode: "prelims", states: {} },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/syllabus-tracker
 */
export const saveTrackerState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mode, states } = req.body;

    if (!states || typeof states !== "object") {
      return res.status(400).json({ status: "error", message: "states object is required" });
    }

    const trackerQuota = await getFeatureStatus(req.user!.id, "syllabus_tracker_items");
    if (trackerQuota.limit !== null && countTrackedItems(states) > trackerQuota.limit) {
      return res.status(403).json({
        status: "error",
        code: "FEATURE_LIMIT_REACHED",
        feature: "syllabus_tracker_items",
        limit: trackerQuota.limit,
        used: countTrackedItems(states),
        remaining: 0,
        period: trackerQuota.period,
        resetAt: trackerQuota.resetAt,
        upgrade: trackerQuota.upgrade || {
          recommendedTier: "rise",
          message: "You can track up to 5 syllabus items on this plan. Upgrade to Rise for full syllabus tracking.",
        },
        message: "You can track up to 5 syllabus items on this plan. Upgrade to Rise for full syllabus tracking.",
      });
    }

    await prisma.syllabusTrackerState.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        mode: mode || "prelims",
        states,
      },
      update: {
        mode: mode || undefined,
        states,
      },
    });

    res.json({ status: "success", message: "Tracker state saved" });
  } catch (error) {
    next(error);
  }
};
