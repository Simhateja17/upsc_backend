import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, tags, order } = req.body;
    if (!name) {
      return res.status(400).json({ status: "error", message: "Name is required" });
    }
    const subject = await prisma.subject.create({
      data: { name, description, tags: tags || [], order: order || 0 },
    });
    res.status(201).json({ status: "success", data: subject });
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
