import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { rotateDailyMCQ, createDailyMainsQuestion } from "../../jobs/dailyContentJob";
import { uploadFile, getSignedUrl, STORAGE_BUCKETS } from "../../config/storage";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

// ==================== Daily MCQ Management ====================

/**
 * GET /api/admin/daily-mcq
 * List daily MCQ sets
 */
export const getDailyMCQSets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "20";
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sets, total] = await Promise.all([
      prisma.dailyMCQ.findMany({
        orderBy: { date: "desc" },
        skip,
        take: parseInt(limit as string),
        include: { _count: { select: { questions: true, attempts: true } } },
      }),
      prisma.dailyMCQ.count(),
    ]);

    res.json({ status: "success", data: { sets, total } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/daily-mcq/generate
 * Trigger daily MCQ rotation manually
 */
export const triggerDailyMCQ = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await rotateDailyMCQ();
    res.json({ status: "success", message: "Daily MCQ set created" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/daily-mcq
 * Manually create a daily MCQ set
 */
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

// ==================== Daily Mains Management ====================

/**
 * GET /api/admin/daily-mains
 * List daily mains questions
 */
export const getDailyMainsQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "20";
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [questions, total] = await Promise.all([
      prisma.dailyMainsQuestion.findMany({
        orderBy: { date: "desc" },
        skip,
        take: parseInt(limit as string),
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.dailyMainsQuestion.count(),
    ]);

    res.json({ status: "success", data: { questions, total } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/daily-mains
 * Create a daily mains question
 */
export const createDailyMains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, title, questionText, paper, subject, marks, wordLimit, timeLimit, instructions } = req.body;

    if (!date || !title || !questionText || !paper || !subject) {
      return res.status(400).json({
        status: "error",
        message: "date, title, questionText, paper, and subject are required",
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
        subject,
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

/**
 * PUT /api/admin/daily-mains/:id
 * Edit a daily mains question
 */
export const updateDailyMains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, questionText, paper, subject, marks, wordLimit, timeLimit, instructions, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (questionText !== undefined) updateData.questionText = questionText;
    if (paper !== undefined) updateData.paper = paper;
    if (subject !== undefined) updateData.subject = subject;
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

/**
 * POST /api/admin/daily-mains/generate
 * Generate tomorrow's mains question using AI
 */
export const triggerDailyMains = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await createDailyMainsQuestion();
    res.json({ status: "success", message: "Daily mains question created" });
  } catch (error) {
    next(error);
  }
};

// ==================== Study Material Management ====================

/**
 * POST /api/admin/library/subjects
 * Create a subject
 */
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

/**
 * POST /api/admin/library/chapters
 * Create a chapter under a subject
 */
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

/**
 * POST /api/admin/library/materials/upload
 * Upload a study material PDF
 */
export const uploadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId, title, type } = req.body;

    if (!req.file || !chapterId || !title) {
      return res.status(400).json({
        status: "error",
        message: "file, chapterId, and title are required",
      });
    }

    const fileName = `${Date.now()}_${req.file.originalname}`;
    const filePath = `materials/${fileName}`;

    await uploadFile(
      STORAGE_BUCKETS.STUDY_MATERIALS,
      filePath,
      req.file.buffer,
      req.file.mimetype
    );

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

// ==================== User Management ====================

/**
 * GET /api/admin/users
 * List users with basic info
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "50";
    const search = qs(req.query.search as string);
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : search;
      where.OR = [
        { email: { contains: searchStr, mode: "insensitive" } },
        { firstName: { contains: searchStr, mode: "insensitive" } },
        { lastName: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: {
              mcqAttempts: true,
              mainsAttempts: true,
              mockTestAttempts: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ status: "success", data: { users, total } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id
 * Update user (role, active status)
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role, isActive } = req.body;

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, isActive: true },
    });

    res.json({ status: "success", data: user });
  } catch (error) {
    next(error);
  }
};

// ==================== Analytics ====================

/**
 * GET /api/admin/analytics
 * Platform analytics dashboard
 */
export const getAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalMCQAttempts,
      totalMainsAttempts,
      totalMockAttempts,
      mcqAttemptsToday,
      totalEditorials,
      totalPYQs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.mCQAttempt.count(),
      prisma.mainsAttempt.count(),
      prisma.mockTestAttempt.count(),
      prisma.mCQAttempt.count({ where: { createdAt: { gte: today } } }),
      prisma.editorial.count(),
      prisma.pYQQuestion.count({ where: { status: "approved" } }),
    ]);

    res.json({
      status: "success",
      data: {
        users: { total: totalUsers, newToday: newUsersToday, newThisWeek: newUsersWeek },
        activity: {
          totalMCQAttempts,
          totalMainsAttempts,
          totalMockAttempts,
          mcqAttemptsToday,
        },
        content: {
          totalEditorials,
          approvedPYQs: totalPYQs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
