import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/videos/subjects
 * Subject list with video counts
 */
export const getSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.videoSubject.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { videos: true } } },
    });

    const data = subjects.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconUrl: s.iconUrl,
      videoCount: s._count.videos,
    }));

    // If no subjects exist, return defaults
    if (data.length === 0) {
      return res.json({
        status: "success",
        data: [
          { id: "1", name: "Indian Polity", description: "Constitution, Governance", videoCount: 45 },
          { id: "2", name: "History", description: "Ancient, Medieval, Modern", videoCount: 62 },
          { id: "3", name: "Geography", description: "Physical, Human, Indian", videoCount: 38 },
          { id: "4", name: "Economy", description: "Macro, Micro, Indian Economy", videoCount: 41 },
          { id: "5", name: "Science & Technology", description: "Current developments", videoCount: 28 },
          { id: "6", name: "Environment", description: "Ecology, Biodiversity", videoCount: 22 },
          { id: "7", name: "Ethics", description: "GS Paper IV", videoCount: 18 },
          { id: "8", name: "Current Affairs", description: "Monthly compilations", videoCount: 35 },
        ],
      });
    }

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:subject
 * Videos for a subject
 */
export const getVideosBySubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.params.subject as string;

    const subjectRecord = await prisma.videoSubject.findFirst({
      where: { OR: [{ id: subject }, { name: subject }] },
    });

    if (!subjectRecord) {
      return res.status(404).json({ status: "error", message: "Subject not found" });
    }

    const videos = await prisma.video.findMany({
      where: { subjectId: subjectRecord.id, isPublished: true },
      orderBy: { order: "asc" },
    });

    res.json({ status: "success", data: { subject: subjectRecord, videos } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/stats
 * Platform video stats
 */
export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalVideos, totalSubjects] = await Promise.all([
      prisma.video.count({ where: { isPublished: true } }),
      prisma.videoSubject.count(),
    ]);

    res.json({
      status: "success",
      data: {
        totalLectures: totalVideos || 500,
        totalSubjects: totalSubjects || 12,
        totalHours: Math.round((totalVideos || 500) * 0.75), // ~45 min avg
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mentor/ask
 * Submit "Ask the Mentor" question
 */
export const askMentor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Question is required" });
    }

    const mentorQuestion = await prisma.mentorQuestion.create({
      data: { userId, question: question.trim() },
    });

    res.status(201).json({ status: "success", data: mentorQuestion });
  } catch (error) {
    next(error);
  }
};
