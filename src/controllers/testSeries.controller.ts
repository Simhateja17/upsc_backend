import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/test-series
 * List all active test series (public)
 */
export const listSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const series = await prisma.testSeries.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = series.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      examMode: s.examMode,
      subject: s.subject,
      difficulty: s.difficulty,
      totalTests: s.totalTests,
      questionsPerTest: s.questionsPerTest,
      price: s.price,
      enrollmentCount: s._count.enrollments,
      createdAt: s.createdAt,
    }));

    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/test-series/enrolled
 * Get current user's enrolled series with progress (auth)
 */
export const getEnrolledSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const enrollments = await prisma.userSeriesEnrollment.findMany({
      where: { userId },
      include: {
        series: {
          include: {
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    const result = enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      testsCompleted: e.testsCompleted,
      series: {
        id: e.series.id,
        title: e.series.title,
        description: e.series.description,
        examMode: e.series.examMode,
        subject: e.series.subject,
        difficulty: e.series.difficulty,
        totalTests: e.series.totalTests,
        questionsPerTest: e.series.questionsPerTest,
        price: e.series.price,
        enrollmentCount: e.series._count.enrollments,
      },
      progress: `${e.testsCompleted}/${e.series.totalTests} tests done`,
    }));

    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/test-series/:id/enroll
 * Enroll the current user in a series (auth)
 */
export const enrollInSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const seriesId = req.params.id as string;

    const series = await prisma.testSeries.findUnique({ where: { id: seriesId } });
    if (!series || !series.isActive) {
      return res.status(404).json({ status: "error", message: "Test series not found" });
    }

    const enrollment = await prisma.userSeriesEnrollment.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: { userId, seriesId },
      update: {},
    });

    res.json({ status: "success", data: enrollment });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/test-series/:id/enroll
 * Unenroll the current user from a series (auth)
 */
export const unenrollFromSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const seriesId = req.params.id as string;

    await prisma.userSeriesEnrollment.deleteMany({
      where: { userId, seriesId },
    });

    res.json({ status: "success", message: "Unenrolled successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/test-series
 * Admin: create a new test series
 */
export const createSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ status: "error", message: "Admin access required" });
    }

    const { title, description, examMode, subject, difficulty, totalTests, questionsPerTest, price } = req.body;

    if (!title || !description || !examMode || !difficulty || !totalTests || !questionsPerTest) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const series = await prisma.testSeries.create({
      data: {
        title,
        description,
        examMode,
        subject: subject || null,
        difficulty,
        totalTests: Number(totalTests),
        questionsPerTest: Number(questionsPerTest),
        price: Number(price) || 0,
      },
    });

    res.status(201).json({ status: "success", data: series });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/test-series/:id
 * Admin: update an existing test series
 */
export const updateSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ status: "error", message: "Admin access required" });
    }

    const seriesId = req.params.id as string;
    const { title, description, examMode, subject, difficulty, totalTests, questionsPerTest, price, isActive } = req.body;

    const existing = await prisma.testSeries.findUnique({ where: { id: seriesId } });
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Test series not found" });
    }

    const series = await prisma.testSeries.update({
      where: { id: seriesId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(examMode !== undefined && { examMode }),
        ...(subject !== undefined && { subject: subject || null }),
        ...(difficulty !== undefined && { difficulty }),
        ...(totalTests !== undefined && { totalTests: Number(totalTests) }),
        ...(questionsPerTest !== undefined && { questionsPerTest: Number(questionsPerTest) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json({ status: "success", data: series });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/test-series/:id
 * Admin: delete a test series
 */
export const deleteSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ status: "error", message: "Admin access required" });
    }

    const seriesId = req.params.id as string;

    await prisma.testSeries.delete({ where: { id: seriesId } });

    res.json({ status: "success", message: "Test series deleted" });
  } catch (error) {
    next(error);
  }
};
