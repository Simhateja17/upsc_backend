import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── GET /api/bookmarks ─────────────────────────────────────────────────────

export const getBookmarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const entityType = req.query.type as string | undefined;

    const where = entityType ? { userId, entityType } : { userId };

    const [bookmarks, totalCount] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.bookmark.count({ where }),
    ]);

    const data = bookmarks.map((b) => ({
      id: b.id,
      type: b.entityType,
      entityId: b.entityId,
      title: b.title,
      source: b.source,
      sourceUrl: b.sourceUrl,
      tag: b.tag,
      tagColor: b.tagColor,
      content: b.content,
      createdAt: b.createdAt.toISOString(),
      isPinned: b.isPinned,
    }));

    res.json({
      status: "success",
      data: {
        bookmarks: data,
        totalCount,
        hasMore: skip + data.length < totalCount,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: { bookmarks: [], totalCount: 0, hasMore: false } });
    }
    next(error);
  }
};

// ── POST /api/bookmarks/toggle ──────────────────────────────────────────────

export const toggleBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { entityType, entityId, title, source, sourceUrl, tag, tagColor, content } = req.body;

    if (!entityType || !entityId || !title || !source) {
      return res.status(400).json({ status: "error", message: "entityType, entityId, title, and source are required" });
    }

    const existing = await prisma.bookmark.findFirst({
      where: { userId, entityType, entityId },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return res.json({ status: "success", data: { isBookmarked: false, bookmarkId: null } });
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        entityType,
        entityId,
        title,
        source,
        sourceUrl: sourceUrl || null,
        tag: tag || null,
        tagColor: tagColor || null,
        content: content ?? undefined,
      },
    });

    res.json({ status: "success", data: { isBookmarked: true, bookmarkId: bookmark.id } });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Bookmarks service not yet available" });
    }
    next(error);
  }
};

// ── DELETE /api/bookmarks/:id ───────────────────────────────────────────────

export const deleteBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookmarkId = req.params.id as string;

    const bookmark = await prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!bookmark) {
      return res.status(404).json({ status: "error", message: "Bookmark not found" });
    }

    await prisma.bookmark.delete({ where: { id: bookmarkId } });
    res.json({ status: "success", message: "Bookmark deleted" });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Bookmarks service not yet available" });
    }
    next(error);
  }
};

// ── GET /api/bookmarks/check ────────────────────────────────────────────────

export const checkBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const entityType = req.query.type as string;
    const entityId = req.query.id as string;

    if (!entityType || !entityId) {
      return res.status(400).json({ status: "error", message: "type and id query params are required" });
    }

    const bookmark = await prisma.bookmark.findFirst({
      where: { userId, entityType, entityId },
    });

    res.json({
      status: "success",
      data: {
        isBookmarked: !!bookmark,
        bookmarkId: bookmark ? bookmark.id : null,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: { isBookmarked: false, bookmarkId: null } });
    }
    next(error);
  }
};

// ── PATCH /api/bookmarks/:id/pin ────────────────────────────────────────────

export const togglePin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookmarkId = req.params.id as string;

    const bookmark = await prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!bookmark) {
      return res.status(404).json({ status: "error", message: "Bookmark not found" });
    }

    const updated = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { isPinned: !bookmark.isPinned },
    });

    res.json({ status: "success", data: { isPinned: updated.isPinned } });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Bookmarks service not yet available" });
    }
    next(error);
  }
};
