import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { isValidSubject, normalizeSubject } from "../../constants/subjects";

// ==================== SUBJECTS ====================

export const getSyllabusSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.syllabusSubject.findMany({
      orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
          include: {
            subTopics: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
    res.json({ status: "success", data: subjects });
  } catch (error) {
    next(error);
  }
};

export const createSyllabusSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage, name, short, icon, color, bg, sortOrder } = req.body;
    if (!stage || !name || !short) {
      return res.status(400).json({ status: "error", message: "stage, name, and short are required" });
    }
    const normalized = normalizeSubject(name);
    if (!isValidSubject(normalized)) {
      return res.status(400).json({ status: "error", message: `Invalid subject "${name}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology` });
    }
    const subject = await prisma.syllabusSubject.create({
      data: { stage, name, short, icon: icon || "", color: color || "", bg: bg || "", sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const updateSyllabusSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { stage, name, short, icon, color, bg, sortOrder } = req.body;
    const data: any = {};
    if (stage !== undefined) data.stage = stage;
    if (name !== undefined) {
      const normalized = normalizeSubject(name);
      if (!isValidSubject(normalized)) {
        return res.status(400).json({ status: "error", message: `Invalid subject "${name}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology` });
      }
      data.name = normalized;
    }
    if (short !== undefined) data.short = short;
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    if (bg !== undefined) data.bg = bg;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const subject = await prisma.syllabusSubject.update({ where: { id }, data });
    res.json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteSyllabusSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.syllabusSubject.delete({ where: { id } });
    res.json({ status: "success", message: "Subject deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== TOPICS ====================

export const createSyllabusTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, name, sortOrder } = req.body;
    if (!subjectId || !name) {
      return res.status(400).json({ status: "error", message: "subjectId and name are required" });
    }
    const topic = await prisma.syllabusTopic.create({
      data: { subjectId, name, sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json({ status: "success", data: topic });
  } catch (error) {
    next(error);
  }
};

export const updateSyllabusTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, sortOrder } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const topic = await prisma.syllabusTopic.update({ where: { id }, data });
    res.json({ status: "success", data: topic });
  } catch (error) {
    next(error);
  }
};

export const deleteSyllabusTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.syllabusTopic.delete({ where: { id } });
    res.json({ status: "success", message: "Topic deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== SUB-TOPICS ====================

export const createSyllabusSubTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topicId, name, sortOrder } = req.body;
    if (!topicId || !name) {
      return res.status(400).json({ status: "error", message: "topicId and name are required" });
    }
    const subTopic = await prisma.syllabusSubTopic.create({
      data: { topicId, name, sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json({ status: "success", data: subTopic });
  } catch (error) {
    next(error);
  }
};

export const updateSyllabusSubTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, sortOrder } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const subTopic = await prisma.syllabusSubTopic.update({ where: { id }, data });
    res.json({ status: "success", data: subTopic });
  } catch (error) {
    next(error);
  }
};

export const deleteSyllabusSubTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.syllabusSubTopic.delete({ where: { id } });
    res.json({ status: "success", message: "Sub-topic deleted" });
  } catch (error) {
    next(error);
  }
};
