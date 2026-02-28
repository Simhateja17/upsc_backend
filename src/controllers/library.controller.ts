import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/library/subjects
 * Subjects with PDF counts and tags
 */
export const getSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: "asc" },
      include: {
        chapters: {
          include: { _count: { select: { materials: true } } },
        },
      },
    });

    const data = subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconUrl: s.iconUrl,
      tags: s.tags,
      chapterCount: s.chapters.length,
      pdfCount: s.chapters.reduce((sum: number, c: any) => sum + c._count.materials, 0),
    }));

    // Return defaults if empty
    if (data.length === 0) {
      return res.json({
        status: "success",
        data: [
          { id: "1", name: "Indian Polity", description: "M. Laxmikanth", tags: ["Prelims", "Mains"], chapterCount: 12, pdfCount: 48 },
          { id: "2", name: "History", description: "Spectrum & Bipin Chandra", tags: ["Prelims"], chapterCount: 15, pdfCount: 52 },
          { id: "3", name: "Geography", description: "Majid Husain & NCERT", tags: ["Prelims", "Mains"], chapterCount: 10, pdfCount: 38 },
          { id: "4", name: "Economy", description: "Ramesh Singh & Sriram IAS", tags: ["Prelims", "Mains"], chapterCount: 14, pdfCount: 45 },
          { id: "5", name: "Science & Technology", description: "Current focus", tags: ["Prelims"], chapterCount: 8, pdfCount: 24 },
          { id: "6", name: "Environment", description: "Shankar IAS", tags: ["Prelims", "Mains"], chapterCount: 6, pdfCount: 18 },
        ],
      });
    }

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/library/subjects/:id/chapters
 * Chapters for a subject
 */
export const getChapters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            materials: {
              select: { id: true, title: true, type: true, fileSize: true, pageCount: true },
            },
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ status: "error", message: "Subject not found" });
    }

    res.json({ status: "success", data: { subject: { id: subject.id, name: subject.name }, chapters: subject.chapters } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/library/download/:chapterId
 * PDF download URL
 */
export const getDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = req.params.chapterId as string;

    const materials = await prisma.studyMaterial.findMany({
      where: { chapterId },
    });

    if (materials.length === 0) {
      return res.status(404).json({ status: "error", message: "No materials found for this chapter" });
    }

    res.json({
      status: "success",
      data: materials.map(m => ({
        id: m.id,
        title: m.title,
        type: m.type,
        fileUrl: m.fileUrl,
        fileSize: m.fileSize,
        pageCount: m.pageCount,
      })),
    });
  } catch (error) {
    next(error);
  }
};
