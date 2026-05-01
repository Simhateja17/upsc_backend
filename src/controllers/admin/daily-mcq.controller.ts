import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { rotateDailyMCQ } from "../../jobs/dailyContentJob";
import { qs } from "./util";

export const getDailyMCQSets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "20";
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sets, total] = await Promise.all([
      prisma.dailyMCQ.findMany({
        orderBy: { date: "desc" },
        skip,
        take: parseInt(limit),
        include: { _count: { select: { questions: true, attempts: true } } },
      }),
      prisma.dailyMCQ.count(),
    ]);

    res.json({ status: "success", data: { sets, total } });
  } catch (error) {
    next(error);
  }
};

export const triggerDailyMCQ = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await rotateDailyMCQ();
    res.json({ status: "success", message: "Daily MCQ set created" });
  } catch (error) {
    next(error);
  }
};

export const createDailyMCQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, title, topic, tags, questions } = req.body;

    if (!date || !title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        status: "error",
        message: "date, title, and questions array are required",
      });
    }

    const mcqDate = new Date(date);
    mcqDate.setHours(0, 0, 0, 0);

    const dailyMcq = await prisma.dailyMCQ.create({
      data: {
        date: mcqDate,
        title,
        topic: topic || "Mixed",
        tags: tags || [],
        questionCount: questions.length,
        timeLimit: questions.length * 2,
        totalMarks: questions.length * 2,
        isActive: true,
      },
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await prisma.mCQQuestion.create({
        data: {
          dailyMcqId: dailyMcq.id,
          questionNum: i + 1,
          questionText: q.questionText,
          category: q.category || q.subject || "General",
          difficulty: q.difficulty || "Medium",
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation,
        },
      });
    }

    res.status(201).json({ status: "success", data: dailyMcq });
  } catch (error) {
    next(error);
  }
};
