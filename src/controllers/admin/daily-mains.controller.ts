import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { createDailyMainsQuestion } from "../../jobs/dailyContentJob";
import { qs } from "./util";
import { isValidSubject, normalizeSubject } from "../../constants/subjects";

export const getDailyMainsQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "20";
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [questions, total] = await Promise.all([
      prisma.dailyMainsQuestion.findMany({
        orderBy: { date: "desc" },
        skip,
        take: parseInt(limit),
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.dailyMainsQuestion.count(),
    ]);

    res.json({ status: "success", data: { questions, total } });
  } catch (error) {
    next(error);
  }
};

export const createDailyMains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, title, questionText, paper, subject, marks, wordLimit, timeLimit, instructions } = req.body;

    if (!date || !title || !questionText || !paper || !subject) {
      return res.status(400).json({
        status: "error",
        message: "date, title, questionText, paper, and subject are required",
      });
    }

    const normalizedSubject = normalizeSubject(subject);
    if (!isValidSubject(normalizedSubject)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid subject "${subject}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology`,
      });
    }

    const questionDate = new Date(date);
    questionDate.setHours(0, 0, 0, 0);

    const question = await prisma.dailyMainsQuestion.create({
      data: {
        date: questionDate,
        title,
        questionText,
        paper,
        subject: normalizedSubject,
        marks: marks || 15,
        wordLimit: wordLimit || 250,
        timeLimit: timeLimit || 20,
        instructions,
        isActive: true,
      },
    });

    res.status(201).json({ status: "success", data: question });
  } catch (error) {
    next(error);
  }
};

export const updateDailyMains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, questionText, paper, subject, marks, wordLimit, timeLimit, instructions, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (questionText !== undefined) updateData.questionText = questionText;
    if (paper !== undefined) updateData.paper = paper;
    if (subject !== undefined) {
      const normalized = normalizeSubject(subject);
      if (!isValidSubject(normalized)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid subject "${subject}". Must be one of: History, Geography, Polity, Economy, Environment & Ecology, Science & Technology`,
        });
      }
      updateData.subject = normalized;
    }
    if (marks !== undefined) updateData.marks = marks;
    if (wordLimit !== undefined) updateData.wordLimit = wordLimit;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const question = await prisma.dailyMainsQuestion.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: "success", data: question });
  } catch (error) {
    next(error);
  }
};

export const triggerDailyMains = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await createDailyMainsQuestion();
    res.json({ status: "success", message: "Daily mains question created" });
  } catch (error) {
    next(error);
  }
};
