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
      include: {
        _count: {
          select: { videos: { where: { isPublished: true } } },
        },
      },
    });

    const data = subjects.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconUrl: s.iconUrl,
      videoCount: s._count.videos,
    }));

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
    console.log(`[Videos] Fetching videos for subject: ${subject}`);

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
    const [totalVideos, totalSubjects, duration] = await Promise.all([
      prisma.video.count({ where: { isPublished: true } }),
      prisma.videoSubject.count(),
      prisma.video.aggregate({
        where: { isPublished: true },
        _sum: { duration: true },
      }),
    ]);

    res.json({
      status: "success",
      data: {
        totalLectures: totalVideos,
        totalSubjects,
        totalHours: Math.round((duration._sum.duration ?? 0) / 3600),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id/questions
 * Questions for a video (options only, no correct answer)
 */
export const getVideoQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const videoId = req.params.id as string;
    const questions = await prisma.videoQuestion.findMany({
      where: { videoId },
      orderBy: { order: "asc" },
      select: { id: true, question: true, options: true, order: true },
    });
    res.json({ status: "success", data: questions });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/videos/:id/submit
 * Student submits answers; returns correct answers + explanations
 */
export const submitVideoQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const videoId = req.params.id as string;
    const { answers } = req.body as { answers: Record<string, number> };

    const questions = await prisma.videoQuestion.findMany({
      where: { videoId },
      orderBy: { order: "asc" },
    });

    const results = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation,
      selected: answers?.[q.id] ?? null,
      isCorrect: answers?.[q.id] === q.correctOption,
    }));

    const correct = results.filter(r => r.isCorrect).length;
    res.json({ status: "success", data: { results, score: correct, total: questions.length } });
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
    console.log(`[Mentor] Question submitted by user: ${userId}`);

    res.status(201).json({ status: "success", data: mentorQuestion });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/mentor/questions  (admin only)
 * List all mentor questions with user info, latest first
 */
export const listMentorQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const status = req.query.status as string | undefined;

    const where = status ? { status } : {};

    const [questions, total] = await Promise.all([
      prisma.mentorQuestion.findMany({
        where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mentorQuestion.count({ where }),
    ]);

    res.json({ status: "success", data: { questions, total, page, limit } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/videos/mentor/questions/:id  (admin only)
 * Update answer/status of a mentor question
 */
export const updateMentorQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { answer, status } = req.body;

    const updated = await prisma.mentorQuestion.update({
      where: { id },
      data: {
        ...(answer !== undefined && { answer: answer.trim() }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ status: "success", data: updated });
  } catch (error) {
    next(error);
  }
};
