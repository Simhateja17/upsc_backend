import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { deleteFile, uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { isValidSubject, normalizeSubject } from "../../constants/subjects";

const VALID_ACCESS_LEVELS = new Set(["free", "trial", "paid"]);
const VALID_MATERIAL_TYPES = new Set(["Notes", "PYQ Notes", "Revision", "Current Affairs", "Other"]);

function normalizeAccessLevel(value: unknown): string {
  const accessLevel = String(value || "free").toLowerCase();
  return VALID_ACCESS_LEVELS.has(accessLevel) ? accessLevel : "free";
}

function normalizeMaterialType(value: unknown): string {
  const type = String(value || "Notes").trim();
  return VALID_MATERIAL_TYPES.has(type) ? type : "Other";
}

// ==================== SYLLABUS-BACKED LIBRARY TREE ====================

export const getSyllabusTree = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stage = String(req.query.stage || "prelims");
    const subjects = await prisma.syllabusSubject.findMany({
      where: { stage },
      orderBy: { sortOrder: "asc" },
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
          include: {
            subTopics: {
              orderBy: { sortOrder: "asc" },
              include: {
                _count: { select: { studyMaterials: true } },
              },
            },
          },
        },
      },
    });

    res.json({
      status: "success",
      data: subjects.map((subject) => ({
        ...subject,
        pdfCount: subject.topics.reduce(
          (sum, topic) => sum + topic.subTopics.reduce((inner, subTopic) => inner + subTopic._count.studyMaterials, 0),
          0
        ),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SUBJECTS ====================

export const getSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.syllabusSubject.findMany({
      where: { stage: "prelims" },
      orderBy: { sortOrder: "asc" },
      include: {
        topics: {
          include: {
            subTopics: {
              include: { _count: { select: { studyMaterials: true } } },
            },
          },
        },
      },
    });
    res.json({
      status: "success",
      data: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        short: subject.short,
        icon: subject.icon,
        color: subject.color,
        bg: subject.bg,
        stage: subject.stage,
        _count: { chapters: subject.topics.length },
        pdfCount: subject.topics.reduce(
          (sum, topic) => sum + topic.subTopics.reduce((inner, subTopic) => inner + subTopic._count.studyMaterials, 0),
          0
        ),
      })),
    });
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
    const topicId = req.query.topicId as string | undefined;
    const where = topicId ? { syllabusSubTopicId: topicId } : chapterId ? { chapterId } : {};
    const materials = await prisma.studyMaterial.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.json({ status: "success", data: materials });
  } catch (error) {
    next(error);
  }
};

export const uploadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId, topicId, title, type, description, accessLevel, isPublished, order } = req.body;
    if (!req.file || !title || (!topicId && !chapterId)) {
      return res.status(400).json({ status: "error", message: "file, title, and topicId are required" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ status: "error", message: "Only PDF files are allowed" });
    }

    if (topicId) {
      const topic = await prisma.syllabusSubTopic.findUnique({ where: { id: topicId } });
      if (!topic) {
        return res.status(404).json({ status: "error", message: "Topic not found" });
      }
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = `materials/${fileName}`;

    await uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, filePath, req.file.buffer, "application/pdf");

    const material = await prisma.studyMaterial.create({
      data: {
        chapterId: chapterId || null,
        syllabusSubTopicId: topicId || null,
        title,
        type: normalizeMaterialType(type),
        description: description || null,
        accessLevel: normalizeAccessLevel(accessLevel),
        isPublished: isPublished === undefined ? true : String(isPublished) === "true",
        order: Number.parseInt(String(order || "0"), 10) || 0,
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
    const material = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) {
      return res.status(404).json({ status: "error", message: "Material not found" });
    }
    await prisma.studyMaterial.delete({ where: { id } });
    if (material.fileUrl && !material.fileUrl.startsWith("http")) {
      try {
        await deleteFile(STORAGE_BUCKETS.STUDY_MATERIALS, material.fileUrl);
      } catch (error) {
        console.warn("[Admin Library] Failed to delete material file:", error);
      }
    }
    res.json({ status: "success", message: "Material deleted" });
  } catch (error) {
    next(error);
  }
};
