import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { isValidSubject, normalizeSubject } from "../../constants/subjects";

export const getVideoSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.videoSubject.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { videos: true } } },
    });
    res.json({ status: "success", data: subjects });
  } catch (error) {
    next(error);
  }
};

export const createVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, iconUrl, order } = req.body;
    if (!name) return res.status(400).json({ status: "error", message: "Name is required" });
    const normalized = normalizeSubject(name);
    if (!isValidSubject(normalized)) {
      return res.status(400).json({ status: "error", message: `Invalid subject "${name}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology` });
    }
    const subject = await prisma.videoSubject.create({
      data: { name: normalized, description, iconUrl, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const updateVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, iconUrl, order } = req.body;
    const data: any = {};
    if (name !== undefined) {
      const normalized = normalizeSubject(name);
      if (!isValidSubject(normalized)) {
        return res.status(400).json({ status: "error", message: `Invalid subject "${name}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology` });
      }
      data.name = normalized;
    }
    if (description !== undefined) data.description = description;
    if (iconUrl !== undefined) data.iconUrl = iconUrl;
    if (order !== undefined) data.order = order;
    const subject = await prisma.videoSubject.update({ where: { id }, data });
    res.json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.videoSubject.delete({ where: { id } });
    res.json({ status: "success", message: "Subject deleted" });
  } catch (error) {
    next(error);
  }
};

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, title, description, videoUrl, thumbnailUrl, duration, instructor, order } = req.body;
    if (!subjectId || !title) {
      return res.status(400).json({ status: "error", message: "subjectId and title are required" });
    }
    const video = await prisma.video.create({
      data: { subjectId, title, description, videoUrl, thumbnailUrl, duration, instructor, order: order ?? 0 },
    });
    await prisma.videoSubject.update({
      where: { id: subjectId },
      data: { videoCount: { increment: 1 } },
    });
    res.status(201).json({ status: "success", data: video });
  } catch (error) {
    next(error);
  }
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, description, videoUrl, thumbnailUrl, duration, instructor, order, isPublished } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (videoUrl !== undefined) data.videoUrl = videoUrl;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
    if (duration !== undefined) data.duration = duration;
    if (instructor !== undefined) data.instructor = instructor;
    if (order !== undefined) data.order = order;
    if (isPublished !== undefined) data.isPublished = isPublished;
    const video = await prisma.video.update({ where: { id }, data });
    res.json({ status: "success", data: video });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return res.status(404).json({ status: "error", message: "Video not found" });
    await prisma.video.delete({ where: { id } });
    await prisma.videoSubject.update({
      where: { id: video.subjectId },
      data: { videoCount: { decrement: 1 } },
    });
    res.json({ status: "success", message: "Video deleted" });
  } catch (error) {
    next(error);
  }
};

export const getVideoQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const videoId = req.params.id as string;
    const questions = await prisma.videoQuestion.findMany({
      where: { videoId },
      orderBy: { order: "asc" },
    });
    res.json({ status: "success", data: questions });
  } catch (error) {
    next(error);
  }
};

export const createVideoQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const videoId = req.params.id as string;
    const { question, options, correctOption, explanation, order } = req.body;
    if (!question || !options || correctOption === undefined) {
      return res.status(400).json({ status: "error", message: "question, options, and correctOption are required" });
    }
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ status: "error", message: "options must be an array of 4 strings" });
    }
    const q = await prisma.videoQuestion.create({
      data: { videoId, question, options, correctOption: Number(correctOption), explanation, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: q });
  } catch (error) {
    next(error);
  }
};

export const deleteVideoQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qid = req.params.qid as string;
    await prisma.videoQuestion.delete({ where: { id: qid } });
    res.json({ status: "success", message: "Question deleted" });
  } catch (error) {
    next(error);
  }
};
