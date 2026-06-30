import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
// isValidSubject/normalizeSubject used for admin seeds; study planner variants used for user addItem
import { isValidSubject, normalizeSubject, isValidStudyPlannerSubject, normalizeStudyPlannerSubject } from "../constants/subjects";
import { getEffectiveEntitlements } from "../services/entitlements.service";

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

function mapItem(item: {
  id: string;
  questionText: string;
  answer: string;
  subject: string;
  topic: string | null;
  nextReviewAt: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  status: string;
  sourceType?: string;
  source?: string;
  scheduleDay?: number;
  scheduleDays?: number[] | null;
  remindEnabled?: boolean;
  addedToFlashcard?: boolean;
}) {
  return {
    id: item.id,
    questionText: item.questionText,
    question: item.questionText,
    answer: item.answer,
    subject: item.subject,
    topic: item.topic ?? null,
    sourceType: item.sourceType ?? 'custom',
    source: item.source ?? 'Custom',
    scheduleDay: item.scheduleDay ?? item.interval ?? 3,
    scheduleDays: item.scheduleDays ?? null,
    remindEnabled: item.remindEnabled ?? false,
    addedToFlashcard: item.addedToFlashcard ?? false,
    nextReviewAt: item.nextReviewAt.toISOString(),
    dueDate: item.nextReviewAt.toISOString(),
    interval: item.interval,
    easeFactor: item.easeFactor,
    repetitions: item.repetitions,
    status: item.status,
  };
}

async function spacedRepAccess(userId: string) {
  const effective = await getEffectiveEntitlements(userId);
  const access = effective.policy.access.spaced_repetition || "none";
  const limit = effective.policy.preview.spaced_repetition_questions;
  return { access, limit };
}

function blockSpacedRep(res: Response) {
  res.status(403).json({
    status: "error",
    code: "FEATURE_ACCESS_REQUIRED",
    feature: "spaced_repetition",
    message: "Upgrade to Aspire to unlock spaced repetition.",
    upgrade: { recommendedTier: "aspire", message: "Upgrade to Aspire to unlock spaced repetition." },
  });
}

function applySM2(
  repetitions: number,
  easeFactor: number,
  interval: number,
  rating: string
): { repetitions: number; easeFactor: number; interval: number } {
  const qualityMap: Record<string, number> = { forgot: 0, hard: 1, good: 2, easy: 3 };
  const quality = qualityMap[rating] ?? 2;

  let newRepetitions: number;
  let newInterval: number;

  if (quality < 2) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  }

  let newEaseFactor = easeFactor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02);
  newEaseFactor = Math.max(1.3, newEaseFactor);

  return { repetitions: newRepetitions, easeFactor: newEaseFactor, interval: newInterval };
}

/**
 * GET /api/spaced-repetition/seeds
 * Returns user's own items grouped as overdue / dueToday / scheduled + streak
 */
export const getSeeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const access = await spacedRepAccess(userId);
    if (access.access === "none") return blockSpacedRep(res);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const allItems = await prisma.spacedRepItem.findMany({
      where: { userId },
      orderBy: { nextReviewAt: "asc" },
    });

    const overdue = allItems.filter((i) => i.nextReviewAt < todayStart).map(mapItem);
    const dueToday = allItems
      .filter((i) => i.nextReviewAt >= todayStart && i.nextReviewAt < tomorrowStart)
      .map(mapItem);
    const scheduled = allItems.filter((i) => i.nextReviewAt >= tomorrowStart).map(mapItem);

    // Streak: consecutive days with at least one review ending at today or yesterday
    const reviewedItems = allItems.filter((i) => i.lastReviewedAt != null);
    const reviewDateKeys = new Set(
      reviewedItems.map((i) => {
        const d = i.lastReviewedAt!;
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );

    let streak = 0;
    let checkDate = new Date(todayStart);
    const todayKey = `${todayStart.getFullYear()}-${todayStart.getMonth()}-${todayStart.getDate()}`;
    if (!reviewDateKeys.has(todayKey)) {
      // Start from yesterday if not reviewed today
      checkDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    }
    for (let i = 0; i < 365; i++) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (!reviewDateKeys.has(key)) break;
      streak++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const limited = access.access !== "full" && typeof access.limit === "number";
    const visibleLimit = limited ? access.limit! : undefined;
    res.json({
      status: "success",
      data: {
        overdue: limited ? overdue.slice(0, visibleLimit) : overdue,
        dueToday: limited ? dueToday.slice(0, visibleLimit) : dueToday,
        scheduled: limited ? scheduled.slice(0, visibleLimit) : scheduled,
        streak,
      },
      access: limited ? { mode: "limited", upgradeRequired: true, visibleItemsLimit: visibleLimit } : { mode: "full" },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/spaced-repetition/subjects
 * Returns per-subject card counts and due counts for the current user
 */
export const getSubjectSummaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const access = await spacedRepAccess(userId);
    if (access.access === "none") return blockSpacedRep(res);
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const items = await prisma.spacedRepItem.findMany({
      where: { userId },
      select: { subject: true, nextReviewAt: true },
    });

    const subjectMap: Record<string, { total: number; due: number }> = {};
    for (const item of items) {
      if (!subjectMap[item.subject]) subjectMap[item.subject] = { total: 0, due: 0 };
      subjectMap[item.subject].total++;
      if (item.nextReviewAt < tomorrowStart) subjectMap[item.subject].due++;
    }

    const data = Object.entries(subjectMap).map(([subject, { total, due }]) => ({
      subject,
      totalCards: total,
      dueCount: due,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/spaced-repetition
 */
export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const access = await spacedRepAccess(userId);
    if (access.access === "none") return blockSpacedRep(res);
    const rawSubject = req.query.subject;
    const subject =
      Array.isArray(rawSubject) ? String(rawSubject[0]) : typeof rawSubject === "string" ? rawSubject : undefined;

    const where: { userId: string; subject?: string } = { userId };
    if (subject) where.subject = subject;

    const items = await prisma.spacedRepItem.findMany({
      where,
      orderBy: { nextReviewAt: "asc" },
    });

    const limited = access.access !== "full" && typeof access.limit === "number";
    const visibleLimit = limited ? access.limit! : undefined;
    res.json({
      status: "success",
      data: (limited ? items.slice(0, visibleLimit) : items).map(mapItem),
      access: limited ? { mode: "limited", upgradeRequired: true, visibleItemsLimit: visibleLimit } : { mode: "full" },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/spaced-repetition
 */
export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const access = await spacedRepAccess(userId);
    if (access.access === "none") return blockSpacedRep(res);
    if (access.access !== "full" && typeof access.limit === "number") {
      const existingCount = await prisma.spacedRepItem.count({ where: { userId } });
      if (existingCount >= access.limit) {
        res.status(403).json({
          status: "error",
          code: "FEATURE_LIMIT_REACHED",
          feature: "spaced_repetition",
          limit: access.limit,
          used: existingCount,
          remaining: 0,
          period: "total",
          message: "Upgrade to Rise to unlock the full spaced repetition system.",
          upgrade: { recommendedTier: "rise", message: "Upgrade to Rise to unlock the full spaced repetition system." },
        });
        return;
      }
    }
    const { question, questionText, answer, subject, topic, scheduleDay, scheduleDays, source, sourceType, remindEnabled } = req.body;

    const questionContent = question || questionText;
    if (!questionContent || !subject) {
      res.status(400).json({ status: "error", message: "question and subject are required" });
      return;
    }

    const normalizedSubject = normalizeStudyPlannerSubject(subject);
    if (!isValidStudyPlannerSubject(normalizedSubject)) {
      res.status(400).json({
        status: "error",
        message: `Invalid subject "${subject}".`,
      });
      return;
    }

    const days = typeof scheduleDay === "number" ? scheduleDay : (scheduleDays && scheduleDays.length > 0 ? scheduleDays[0] : 3);
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + days);

    const item = await prisma.spacedRepItem.create({
      data: {
        userId,
        questionText: questionContent,
        answer: answer || "",
        subject: normalizedSubject,
        topic: topic || null,
        interval: days,
        scheduleDay: days,
        source: source || 'Custom',
        sourceType: sourceType || 'custom',
        remindEnabled: remindEnabled || false,
        nextReviewAt,
        status: "new",
      },
    });

    res.status(201).json({ status: "success", data: mapItem(item) });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/spaced-repetition/:id
 * Accepts { rating } for SM-2 update, or { scheduleDay, remindEnabled, addedToFlashcard } for legacy update
 */
export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = param(req, "id");
    const { rating, scheduleDay, remindEnabled, addedToFlashcard } = req.body;

    const existing = await prisma.spacedRepItem.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ status: "error", message: "Item not found" });
      return;
    }

    if (rating) {
      const { repetitions, easeFactor, interval } = applySM2(
        existing.repetitions,
        existing.easeFactor,
        existing.interval,
        rating
      );

      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + interval);

      const qualityMap: Record<string, number> = { forgot: 0, hard: 1, good: 2, easy: 3 };
      const quality = qualityMap[rating] ?? 2;
      const status = quality < 2 ? "review" : repetitions >= 2 ? "review" : "learning";

      const updated = await prisma.spacedRepItem.update({
        where: { id },
        data: { repetitions, easeFactor, interval, nextReviewAt, status, lastReviewedAt: new Date() },
      });

      res.json({ status: "success", data: mapItem(updated) });
    } else {
      const updateData: {
        scheduleDay?: number;
        interval?: number;
        nextReviewAt?: Date;
        remindEnabled?: boolean;
        addedToFlashcard?: boolean;
      } = {};

      if (typeof scheduleDay === "number") {
        updateData.scheduleDay = scheduleDay;
        updateData.interval = scheduleDay;
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + scheduleDay);
        updateData.nextReviewAt = nextReviewAt;
      }
      if (remindEnabled !== undefined) updateData.remindEnabled = Boolean(remindEnabled);
      if (addedToFlashcard !== undefined) updateData.addedToFlashcard = Boolean(addedToFlashcard);

      const updated = await prisma.spacedRepItem.update({ where: { id }, data: updateData });
      res.json({ status: "success", data: mapItem(updated) });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/spaced-repetition/:id
 */
export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
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

// ==================== ADMIN SEEDS ====================

/**
 * GET /api/admin/spaced-rep/seeds
 */
export const adminGetSeeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.query.subject as string | undefined;
    const seeds = (
      await prisma.spacedRepSeed.findMany({
        where: subject ? { subject } : {},
        orderBy: { createdAt: "asc" },
      })
    ).filter((s) => isValidSubject(s.subject));
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
    const normalized = normalizeSubject(subject);
    if (!isValidSubject(normalized)) {
      res.status(400).json({
        status: "error",
        message: `Invalid subject "${subject}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology`,
      });
      return;
    }
    const seed = await prisma.spacedRepSeed.create({
      data: { subject: normalized, topic: topic || null, questionText, difficulty: difficulty || "Medium" },
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
    const data: { topic?: string; questionText?: string; difficulty?: string; subject?: string } = {
      topic,
      questionText,
      difficulty,
    };
    if (subject !== undefined) {
      const normalized = normalizeSubject(subject);
      if (!isValidSubject(normalized)) {
        res.status(400).json({
          status: "error",
          message: `Invalid subject "${subject}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology`,
        });
        return;
      }
      data.subject = normalized;
    }
    const seed = await prisma.spacedRepSeed.update({ where: { id }, data });
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
