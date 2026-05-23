import { Request, Response, NextFunction } from "express";
import {
  completeGoogleCalendarOAuth,
  createGoogleCalendarAuthUrl,
  getGoogleCalendarSyncStatus,
  setGoogleCalendarSyncEnabled,
} from "../services/googleCalendarSync.service";

export const getCalendarSyncStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const status = await getGoogleCalendarSyncStatus(userId);
    res.json({ status: "success", data: status });
  } catch (error) {
    next(error);
  }
};

export const getGoogleCalendarAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const url = createGoogleCalendarAuthUrl(userId);
    res.json({ status: "success", data: { url } });
  } catch (error) {
    next(error);
  }
};

export const completeGoogleCalendarCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { code, state } = req.body as { code?: string; state?: string };

    if (!code || !state) {
      return res.status(400).json({ status: "error", message: "Google Calendar code and state are required" });
    }

    await completeGoogleCalendarOAuth(userId, code, state);
    const status = await getGoogleCalendarSyncStatus(userId);
    res.json({ status: "success", data: status });
  } catch (error) {
    next(error);
  }
};

export const updateCalendarSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { enabled } = req.body as { enabled?: boolean };

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ status: "error", message: "enabled must be a boolean" });
    }

    const result = await setGoogleCalendarSyncEnabled(userId, enabled);
    if (result.needsAuth) {
      return res.json({ status: "success", data: result });
    }

    const status = await getGoogleCalendarSyncStatus(userId);
    res.json({ status: "success", data: status });
  } catch (error) {
    next(error);
  }
};
