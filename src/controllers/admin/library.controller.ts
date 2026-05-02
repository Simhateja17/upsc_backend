import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { isValidSubject, normalizeSubject } from "../../constants/subjects";

// ==================== SUBJECTS ====================

export const getSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { chapters: true } },
      },
    });
    res.json({ status: "success", data: subjects });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, tags, order } = req.body;
    if (!name) {
      return res.status(400).json({ status: "error", message: "Name is required" });
    }
    const normalized = normalizeSubject(name);
    if (!isValidSubject(normalized)) {
      return res.status(400).json({ status: "error", message: `Invalid subject "${name}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology` });
    }
    const subject = await prisma.subject.create({
      data: { name: normalized, description, tags: tags || [], order: order || 0 },
    });
    res.status(201).json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, tags, order } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (tags !== undefined) data.tags = tags;
    if (order !== undefined) data.order = order;
    const subject = await prisma.subject.update({ where: { id }, data });
    res.json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.subject.delete({ where: { id } });
    res.json({ status: "success", message: "Subject deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== CHAPTERS ====================

export const getChapters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = req.query.subjectId as string | undefined;
    const where = subjectId ? { subjectId } : {};
    const chapters = await prisma.chapter.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        _count: { select: { materials: true } },
      },
    });
    res.json({ status: "success", data: chapters });
  } catch (error) {
    next(error);
  }
};

export const createChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, title, description, order } = req.body;
    if (!subjectId || !title) {
      return res.status(400).json({ status: "error", message: "subjectId and title are required" });
    }
    const chapter = await prisma.chapter.create({
      data: { subjectId, title, description, order: order || 0 },
    });
    res.status(201).json({ status: "success", data: chapter });
  } catch (error) {
    next(error);
  }
};

export const updateChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, description, order } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (order !== undefined) data.order = order;
    const chapter = await prisma.chapter.update({ where: { id }, data });
    res.json({ status: "success", data: chapter });
  } catch (error) {
    next(error);
  }
};

export const deleteChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.chapter.delete({ where: { id } });
    res.json({ status: "success", message: "Chapter deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== MATERIALS ====================

export const getMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = req.query.chapterId as string | undefined;
    const where = chapterId ? { chapterId } : {};
    const materials = await prisma.studyMaterial.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: materials });
  } catch (error) {
    next(error);
  }
};

export const uploadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId, title, type } = req.body;
    if (!req.file || !chapterId || !title) {
      return res.status(400).json({ status: "error", message: "file, chapterId, and title are required" });
    }

    const fileName = `${Date.now()}_${req.file.originalname}`;
    const filePath = `materials/${fileName}`;

    await uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, filePath, req.file.buffer, req.file.mimetype);

    const material = await prisma.studyMaterial.create({
      data: {
        chapterId,
        title,
        type: type || "pdf",
        fileUrl: filePath,
        fileSize: req.file.size,
      },
    });

    res.status(201).json({ status: "success", data: material });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.studyMaterial.delete({ where: { id } });
    res.json({ status: "success", message: "Material deleted" });
  } catch (error) {
    next(error);
  }
};
