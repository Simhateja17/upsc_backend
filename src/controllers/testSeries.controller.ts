import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";

function seriesCategory(series: { examMode: string; subject: string | null; difficulty: string }) {
  return series.subject || series.examMode || series.difficulty || "general";
}

function seriesFeatures(series: { examMode: string; totalTests: number; questionsPerTest: number }) {
  return [
    `${series.totalTests} tests`,
    `${series.questionsPerTest} questions per test`,
    series.examMode === "mains" ? "AI answer evaluation" : "Performance analytics",
  ];
}

function toMobileSeries(
  series: {
    id: string;
    title: string;
    description: string;
    examMode: string;
    subject: string | null;
    difficulty: string;
    totalTests: number;
    questionsPerTest: number;
    price: number;
    _count?: { enrollments?: number };
  },
  enrollment?: { testsCompleted: number } | null
) {
  const completedTests = enrollment?.testsCompleted ?? 0;
  const progress = series.totalTests > 0 ? completedTests / series.totalTests : 0;

  return {
    id: series.id,
    title: series.title,
    description: series.description,
    category: seriesCategory(series),
    testCount: series.totalTests,
    duration: `${series.totalTests} tests`,
    enrolledCount: series._count?.enrollments ?? 0,
    enrollmentCount: series._count?.enrollments ?? 0,
    rating: 4.8,
    price: series.price,
    oldPrice: series.price > 0 ? Math.round(series.price * 1.25) : null,
    features: seriesFeatures(series),
    isEnrolled: Boolean(enrollment),
    progress,
    examMode: series.examMode,
    subject: series.subject,
    difficulty: series.difficulty,
    totalTests: series.totalTests,
    questionsPerTest: series.questionsPerTest,
  };
}

/**
 * GET /api/test-series/stats
 * Public stats for the hero section
 */
export const getSeriesStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [activeSeriesCount, enrollmentAgg, uniqueStudents] = await Promise.all([
      prisma.testSeries.count({ where: { isActive: true } }),
      prisma.userSeriesEnrollment.aggregate({ _sum: { testsCompleted: true } }),
      prisma.userSeriesEnrollment.findMany({ distinct: ["userId"], select: { userId: true } }),
    ]);

    // Pull average accuracy from mock_test_attempts (stored in Supabase)
    const { data: attemptsData } = await supabaseAdmin
      .from("mock_test_attempts")
      .select("accuracy");

    let successRate = 0;
    if (attemptsData && attemptsData.length > 0) {
      const totalAccuracy = attemptsData.reduce((sum: number, a: any) => sum + (a.accuracy || 0), 0);
      successRate = Math.round(totalAccuracy / attemptsData.length);
    }

    res.json({
      status: "success",
      data: {
        activeSeries: activeSeriesCount,
        totalStudents: uniqueStudents.length,
        testsTaken: enrollmentAgg._sum.testsCompleted ?? 0,
        successRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/test-series/:id
 * Get a single test series detail (public)
 */
export const getSeriesDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seriesId = req.params.id as string;

    const series = await prisma.testSeries.findUnique({
      where: { id: seriesId, isActive: true },
      include: {
        tests: {
          where: { isPublished: true },
          orderBy: { testNumber: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!series) {
      return res.status(404).json({ status: "error", message: "Test series not found" });
    }

    res.json({
      status: "success",
      data: {
        ...toMobileSeries(series),
        series: toMobileSeries(series),
        reviews: [],
        faqs: [],
        tests: series.tests.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          questionCount: t.questionCount,
          duration: t.duration,
          status: "pending",
          score: null,
          completedAt: null,
        })),
        id: series.id,
        title: series.title,
        description: series.description,
        examMode: series.examMode,
        subject: series.subject,
        difficulty: series.difficulty,
        totalTests: series.totalTests,
        questionsPerTest: series.questionsPerTest,
        price: series.price,
        enrollmentCount: series._count.enrollments,
        createdAt: series.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/test-series/catalog
 * Mobile app catalog shape: enrolled + available buckets.
 */
export const listSeriesCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const [series, enrollments] = await Promise.all([
      prisma.testSeries.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      userId
        ? prisma.userSeriesEnrollment.findMany({
            where: { userId },
            include: { series: true },
          })
        : Promise.resolve([]),
    ]);

    const enrollmentBySeriesId = new Map(enrollments.map((e) => [e.seriesId, e]));
    const available = series.map((s) => toMobileSeries(s, enrollmentBySeriesId.get(s.id)));
    const enrolled = enrollments
      .filter((e) => e.series?.isActive)
      .map((e) => ({
        id: e.series.id,
        title: e.series.title,
        icon: "📝",
        completedTests: e.testsCompleted,
        totalTests: e.series.totalTests,
        nextTest:
          e.testsCompleted < e.series.totalTests
            ? `Test ${e.testsCompleted + 1}`
            : null,
        progress: e.series.totalTests > 0 ? e.testsCompleted / e.series.totalTests : 0,
      }));

    const categories = Array.from(new Set(available.map((s) => s.category).filter(Boolean)));

    res.json({
      status: "success",
      data: {
        enrolled,
        available,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

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
