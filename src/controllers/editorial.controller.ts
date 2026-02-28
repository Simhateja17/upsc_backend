import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/editorials/today
 * Today's editorial list
 */
export const getTodayEditorials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      publishedAt: { gte: today, lt: tomorrow },
    };
    if (source && source !== "all") {
      where.source = source as string;
    }

    const editorials = await prisma.editorial.findMany({
      where,
      orderBy: { publishedAt: "desc" },
    });

    // If user is authenticated, include their progress
    let progressMap: Record<string, { isRead: boolean; isSaved: boolean }> = {};
    if (req.user) {
      const [progress, bookmarks] = await Promise.all([
        prisma.editorialProgress.findMany({
          where: { userId: req.user.id, editorialId: { in: editorials.map(e => e.id) } },
        }),
        prisma.editorialBookmark.findMany({
          where: { userId: req.user.id, editorialId: { in: editorials.map(e => e.id) } },
        }),
      ]);
      for (const p of progress) {
        progressMap[p.editorialId] = { isRead: p.isRead, isSaved: false };
      }
      for (const b of bookmarks) {
        if (!progressMap[b.editorialId]) progressMap[b.editorialId] = { isRead: false, isSaved: true };
        else progressMap[b.editorialId].isSaved = true;
      }
    }

    const data = editorials.map(e => ({
      ...e,
      isRead: progressMap[e.id]?.isRead || false,
      isSaved: progressMap[e.id]?.isSaved || false,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/:id
 * Individual editorial content
 */
export const getEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const editorial = await prisma.editorial.findUnique({ where: { id } });

    if (!editorial) {
      return res.status(404).json({ status: "error", message: "Editorial not found" });
    }

    res.json({ status: "success", data: editorial });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/mark-read
 */
export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    await prisma.editorialProgress.upsert({
      where: { userId_editorialId: { userId, editorialId: id } },
      create: { userId, editorialId: id, isRead: true, readAt: new Date() },
      update: { isRead: true, readAt: new Date() },
    });

    await prisma.userActivity.create({
      data: { userId, type: "editorial", title: "Read Editorial", metadata: { editorialId: id } },
    });

    res.json({ status: "success", message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/save
 * Toggle save/bookmark
 */
export const toggleSave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.editorialBookmark.findUnique({
      where: { userId_editorialId: { userId, editorialId: id } },
    });

    if (existing) {
      await prisma.editorialBookmark.delete({ where: { id: existing.id } });
      res.json({ status: "success", data: { saved: false } });
    } else {
      await prisma.editorialBookmark.create({ data: { userId, editorialId: id } });
      res.json({ status: "success", data: { saved: true } });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/summarize
 * AI summary generation (placeholder)
 */
export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const editorial = await prisma.editorial.findUnique({ where: { id } });

    if (!editorial) {
      return res.status(404).json({ status: "error", message: "Editorial not found" });
    }

    // If already has AI summary, return it
    if (editorial.aiSummary) {
      return res.json({ status: "success", data: { summary: editorial.aiSummary } });
    }

    // In production, call AI service. For now, generate a placeholder.
    const summary = `Key Points from "${editorial.title}":\n\n1. This editorial discusses important aspects of ${editorial.category}.\n2. The analysis covers recent developments and their implications for UPSC aspirants.\n3. Key constitutional and policy dimensions are examined.\n\nRelevance for UPSC: This topic is relevant for ${editorial.category} in GS Papers.`;

    await prisma.editorial.update({ where: { id: id as string }, data: { aiSummary: summary } });

    res.json({ status: "success", data: { summary } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/stats
 * Reading stats for user
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const totalRead = await prisma.editorialProgress.count({
      where: { userId, isRead: true },
    });

    const totalSaved = await prisma.editorialBookmark.count({ where: { userId } });

    // Weekly count
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyRead = await prisma.editorialProgress.count({
      where: { userId, isRead: true, readAt: { gte: weekStart } },
    });

    const streak = await prisma.userStreak.findUnique({ where: { userId } });

    res.json({
      status: "success",
      data: {
        totalRead,
        totalSaved,
        weeklyRead,
        weeklyTarget: 7,
        streak: streak?.currentStreak || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
