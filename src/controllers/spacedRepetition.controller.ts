import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

/**
 * GET /api/spaced-repetition
 */
export const getItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const rawSourceType = req.query.sourceType;
    const sourceType =
      Array.isArray(rawSourceType)
        ? String(rawSourceType[0])
        : typeof rawSourceType === "string"
        ? rawSourceType
        : undefined;

    const where: { userId: string; sourceType?: string } = { userId };
    if (sourceType) where.sourceType = sourceType;

    const items = await prisma.spacedRepItem.findMany({
      where,
      orderBy: { nextReviewAt: "asc" },
    });

    res.json({ status: "success", data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/spaced-repetition
 */
export const addItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { questionText, source, sourceType, subject, scheduleDay, remindEnabled } = req.body;

    if (!questionText || !subject) {
      res.status(400).json({ status: "error", message: "questionText and subject are required" });
      return;
    }

    const days = typeof scheduleDay === "number" ? scheduleDay : 3;
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + days);

    const item = await prisma.spacedRepItem.create({
      data: {
        userId,
        questionText,
        source: source || "Custom",
        sourceType: sourceType || "custom",
        subject,
        scheduleDay: days,
        remindEnabled: Boolean(remindEnabled),
        nextReviewAt,
      },
    });

    res.status(201).json({ status: "success", data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/spaced-repetition/:id
 */
export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const id = param(req, "id");
    const { scheduleDay, remindEnabled, addedToFlashcard } = req.body;

    const existing = await prisma.spacedRepItem.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ status: "error", message: "Item not found" });
      return;
    }

    const updateData: {
      scheduleDay?: number;
      nextReviewAt?: Date;
      remindEnabled?: boolean;
      addedToFlashcard?: boolean;
    } = {};

    if (typeof scheduleDay === "number") {
      updateData.scheduleDay = scheduleDay;
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + scheduleDay);
      updateData.nextReviewAt = nextReviewAt;
    }
    if (remindEnabled !== undefined) updateData.remindEnabled = Boolean(remindEnabled);
    if (addedToFlashcard !== undefined) updateData.addedToFlashcard = Boolean(addedToFlashcard);

    const updated = await prisma.spacedRepItem.update({ where: { id }, data: updateData });

    res.json({ status: "success", data: updated });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN SEEDS ====================

/**
 * GET /api/admin/spaced-rep/seeds
 */
export const adminGetSeeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.query.subject as string | undefined;
    const seeds = await prisma.spacedRepSeed.findMany({
      where: subject ? { subject } : {},
      orderBy: { createdAt: "asc" },
    });
    res.json({ status: "success", data: seeds });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/spaced-rep/seeds
 */
export const adminCreateSeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, topic, questionText, difficulty } = req.body;
    if (!subject || !questionText) {
      res.status(400).json({ status: "error", message: "subject and questionText are required" });
      return;
    }
    const seed = await prisma.spacedRepSeed.create({
      data: { subject, topic: topic || null, questionText, difficulty: difficulty || "Medium" },
    });
    res.status(201).json({ status: "success", data: seed });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/spaced-rep/seeds/:id
 */
export const adminUpdateSeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, "id");
    const { subject, topic, questionText, difficulty } = req.body;
    const seed = await prisma.spacedRepSeed.update({
      where: { id },
      data: { subject, topic, questionText, difficulty },
    });
    res.json({ status: "success", data: seed });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/spaced-rep/seeds/:id
 */
export const adminDeleteSeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, "id");
    await prisma.spacedRepSeed.delete({ where: { id } });
    res.json({ status: "success", message: "Seed deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/spaced-repetition/seeds  (user-facing)
 */
export const getSeeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.query.subject as string | undefined;
    const seeds = await prisma.spacedRepSeed.findMany({
      where: subject ? { subject } : {},
      orderBy: { createdAt: "asc" },
    });
    res.json({ status: "success", data: seeds });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/spaced-repetition/:id
 */
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const id = param(req, "id");

    const existing = await prisma.spacedRepItem.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ status: "error", message: "Item not found" });
      return;
    }

    await prisma.spacedRepItem.delete({ where: { id } });

    res.json({ status: "success", message: "Item deleted" });
  } catch (error) {
    next(error);
  }
};
