import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

/**
 * GET /api/mindmaps/subjects
 */
export const getSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    const subjects = await prisma.mindmapSubject.findMany({
      include: { maps: true },
    });

    const data = await Promise.all(
      subjects.map(async (s) => {
        const total = s.maps.length;
        let explored = 0;

        if (userId && total > 0) {
          explored = await prisma.userMindmapProgress.count({
            where: { userId, viewed: true, mindmapId: { in: s.maps.map((m) => m.id) } },
          });
        }

        const progress = total > 0 ? Math.round((explored / total) * 100) : 0;

        return {
          id: s.slug,
          name: s.name,
          icon: s.icon,
          slug: s.slug,
          total,
          explored,
          progress,
        };
      })
    );

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mindmaps/:subjectId
 */
export const getMindmaps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjectId = param(req, "subjectId");
    const userId = req.user?.id;

    const subject = await prisma.mindmapSubject.findUnique({
      where: { slug: subjectId },
      include: { maps: { orderBy: { createdAt: "asc" } } },
    });

    if (!subject) {
      res.status(404).json({ status: "error", message: "Subject not found" });
      return;
    }

    const mapIds = subject.maps.map((m) => m.id);
    const progressMap: Record<string, { mastery: number; viewed: boolean }> = {};

    if (userId && mapIds.length > 0) {
      const progress = await prisma.userMindmapProgress.findMany({
        where: { userId, mindmapId: { in: mapIds } },
      });
      for (const p of progress) {
        progressMap[p.mindmapId] = { mastery: p.mastery, viewed: p.viewed };
      }
    }

    const maps = subject.maps.map((m) => ({
      id: m.slug,
      title: m.title,
      slug: m.slug,
      branchCount: Array.isArray(m.branches) ? (m.branches as unknown[]).length : 0,
      mastery: progressMap[m.id]?.mastery ?? 0,
      viewed: progressMap[m.id]?.viewed ?? false,
    }));

    res.json({
      status: "success",
      data: { subject: { name: subject.name, icon: subject.icon }, maps },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mindmaps/:subjectId/:mindmapId
 */
export const getMindmap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjectId = param(req, "subjectId");
    const mindmapId = param(req, "mindmapId");
    const userId = req.user?.id;

    const subject = await prisma.mindmapSubject.findUnique({ where: { slug: subjectId } });
    if (!subject) {
      res.status(404).json({ status: "error", message: "Subject not found" });
      return;
    }

    const mindmap = await prisma.mindmap.findUnique({
      where: { subjectId_slug: { subjectId: subject.id, slug: mindmapId } },
    });

    if (!mindmap) {
      res.status(404).json({ status: "error", message: "Mindmap not found" });
      return;
    }

    let mastery = 0;
    let viewed = false;

    if (userId) {
      const progress = await prisma.userMindmapProgress.findUnique({
        where: { userId_mindmapId: { userId, mindmapId: mindmap.id } },
      });
      mastery = progress?.mastery ?? 0;
      viewed = progress?.viewed ?? false;
    }

    res.json({
      status: "success",
      data: {
        id: mindmap.id,
        slug: mindmap.slug,
        title: mindmap.title,
        subject: subject.name,
        branches: mindmap.branches,
        nodes: mindmap.nodes,
        quizData: mindmap.quizData,
        mastery,
        viewed,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/mindmaps/:mindmapId/progress
 */
export const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const mindmapId = param(req, "mindmapId");
    const { mastery, viewed } = req.body;

    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) {
      res.status(404).json({ status: "error", message: "Mindmap not found" });
      return;
    }

    const updateData: { mastery?: number; viewed?: boolean } = {};
    if (mastery !== undefined) updateData.mastery = Number(mastery);
    if (viewed !== undefined) updateData.viewed = Boolean(viewed);

    const progress = await prisma.userMindmapProgress.upsert({
      where: { userId_mindmapId: { userId, mindmapId } },
      update: updateData,
      create: { userId, mindmapId, mastery: mastery ?? 0, viewed: Boolean(viewed) },
    });

    res.json({ status: "success", data: progress });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mindmaps
 */
export const createMindmap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { subjectSlug, subjectName, subjectIcon, title, slug, branches, nodes, quizData } = req.body;

    if (!subjectSlug || !title || !slug || !branches || !nodes) {
      res.status(400).json({
        status: "error",
        message: "subjectSlug, title, slug, branches, and nodes are required",
      });
      return;
    }

    const subject = await prisma.mindmapSubject.upsert({
      where: { slug: subjectSlug },
      update: {},
      create: {
        name: subjectName || subjectSlug,
        slug: subjectSlug,
        icon: subjectIcon || "🗺️",
      },
    });

    const mindmap = await prisma.mindmap.create({
      data: {
        subjectId: subject.id,
        title,
        slug,
        branches,
        nodes,
        quizData: quizData ?? null,
      },
    });

    res.status(201).json({ status: "success", data: mindmap });
  } catch (error) {
    next(error);
  }
};
