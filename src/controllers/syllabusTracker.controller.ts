import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

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
