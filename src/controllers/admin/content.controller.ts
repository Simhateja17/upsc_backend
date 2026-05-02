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

// ==================== Video Management ====================

/**
 * GET /api/admin/videos/subjects
 */
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

/**
 * POST /api/admin/videos/subjects
 */
export const createVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, iconUrl, order } = req.body;
    if (!name) {
      return res.status(400).json({ status: "error", message: "Name is required" });
    }
    const subject = await prisma.videoSubject.create({
      data: { name, description, iconUrl, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/videos/subjects/:id
 */
export const updateVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, iconUrl, order } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (iconUrl !== undefined) data.iconUrl = iconUrl;
    if (order !== undefined) data.order = order;
    const subject = await prisma.videoSubject.update({ where: { id }, data });
    res.json({ status: "success", data: subject });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/videos/subjects/:id
 */
export const deleteVideoSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.videoSubject.delete({ where: { id } });
    res.json({ status: "success", message: "Subject deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/videos
 */
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

/**
 * PUT /api/admin/videos/:id
 */
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

/**
 * DELETE /api/admin/videos/:id
 */
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

// ==================== Video Questions Management ====================

/**
 * GET /api/admin/videos/:id/questions
 */
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

/**
 * POST /api/admin/videos/:id/questions
 */
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

/**
 * DELETE /api/admin/videos/:videoId/questions/:qid
 */
export const deleteVideoQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qid = req.params.qid as string;
    await prisma.videoQuestion.delete({ where: { id: qid } });
    res.json({ status: "success", message: "Question deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== Testimonials Management ====================

/**
 * GET /api/admin/testimonials
 */
export const getTestimonialsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });
    res.json({ status: "success", data: testimonials });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/testimonials
 */
export const createTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, title, content, avatarUrl, rating, order } = req.body;
    if (!name || !title || !content) {
      return res.status(400).json({ status: "error", message: "name, title, and content are required" });
    }
    const testimonial = await prisma.testimonial.create({
      data: { name, title, content, avatarUrl, rating: rating ?? 5, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: testimonial });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/testimonials/:id
 */
export const updateTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, title, content, avatarUrl, rating, order, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (rating !== undefined) data.rating = rating;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    const testimonial = await prisma.testimonial.update({ where: { id }, data });
    res.json({ status: "success", data: testimonial });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/testimonials/:id
 */
export const deleteTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.testimonial.delete({ where: { id } });
    res.json({ status: "success", message: "Testimonial deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== Pricing Plans Management ====================

/**
 * GET /api/admin/pricing
 */
export const getPricingPlansAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pricingPlan.findMany({ orderBy: { order: "asc" } });
    res.json({ status: "success", data: plans });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pricing
 */
export const createPricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, originalPrice, duration, durationDays, features, notIncluded, badge, isPopular, order } = req.body;
    if (!name || price === undefined || !duration) {
      return res.status(400).json({ status: "error", message: "name, price, and duration are required" });
    }
    const plan = await prisma.pricingPlan.create({
      data: {
        name,
        description,
        price,
        originalPrice,
        duration,
        durationDays: durationDays ?? 90,
        features: features ?? [],
        notIncluded: notIncluded ?? [],
        badge,
        isPopular: isPopular ?? false,
        order: order ?? 0,
      },
    });
    res.status(201).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/pricing/:id
 */
export const updatePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, price, originalPrice, duration, durationDays, features, notIncluded, badge, isPopular, order, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = price;
    if (originalPrice !== undefined) data.originalPrice = originalPrice;
    if (duration !== undefined) data.duration = duration;
    if (durationDays !== undefined) data.durationDays = durationDays;
    if (features !== undefined) data.features = features;
    if (notIncluded !== undefined) data.notIncluded = notIncluded;
    if (badge !== undefined) data.badge = badge;
    if (isPopular !== undefined) data.isPopular = isPopular;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    const plan = await prisma.pricingPlan.update({ where: { id }, data });
    res.json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/pricing/:id
 */
export const deletePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.pricingPlan.delete({ where: { id } });
    res.json({ status: "success", message: "Pricing plan deleted" });
  } catch (error) {
    next(error);
  }
};

// ==================== FAQ Management ====================

export const getFaqsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: "asc", createdAt: "desc" } });
    res.json({ status: "success", data: faqs });
  } catch (error) {
    next(error);
  }
};

export const createFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, question, answer, order } = req.body;
    if (!category || !question || !answer) {
      return res.status(400).json({ status: "error", message: "category, question, and answer are required" });
    }
    const faq = await prisma.faq.create({
      data: { category, question, answer, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: faq });
  } catch (error) {
    next(error);
  }
};

export const updateFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { category, question, answer, order, isActive } = req.body;
    const data: any = {};
    if (category !== undefined) data.category = category;
    if (question !== undefined) data.question = question;
    if (answer !== undefined) data.answer = answer;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    const faq = await prisma.faq.update({ where: { id }, data });
    res.json({ status: "success", data: faq });
  } catch (error) {
    next(error);
  }
};

export const deleteFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.faq.delete({ where: { id } });
    res.json({ status: "success", message: "FAQ deleted" });
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
