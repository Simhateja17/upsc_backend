import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── GET /api/test-series/:seriesId/dashboard ────────────────────────────────

export const getSeriesDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const seriesId = req.params.seriesId as string;

    const series = await prisma.testSeries.findUnique({
      where: { id: seriesId, isActive: true },
      include: {
        tests: {
          where: { isPublished: true },
          orderBy: { testNumber: "asc" },
          include: {
            _count: { select: { attempts: true } },
          },
        },
        enrollments: {
          where: { userId },
        },
      },
    });

    if (!series) {
      return res.status(404).json({ status: "error", message: "Test series not found" });
    }

    const enrollment = series.enrollments[0];
    const tests = series.tests.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      testNumber: t.testNumber,
      examMode: t.examMode,
      subject: t.subject,
      questionCount: t.questionCount,
      duration: t.duration,
      totalMarks: t.totalMarks,
      isCompleted: !!enrollment && enrollment.testsCompleted >= t.testNumber,
      attemptCount: t._count.attempts,
    }));

    const completedCount = tests.filter((t) => t.isCompleted).length;
    const avgAccuracy = enrollment
      ? await getAverageAccuracyForSeries(userId, seriesId)
      : 0;

    res.json({
      status: "success",
      data: {
        id: series.id,
        title: series.title,
        description: series.description,
        examMode: series.examMode,
        totalTests: series.totalTests,
        questionsPerTest: series.questionsPerTest,
        completedTests: completedCount,
        avgAccuracy,
        tests,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: { id: req.params.seriesId, title: "Test Series", tests: [], completedTests: 0, avgAccuracy: 0 } });
    }
    next(error);
  }
};

// ── POST /api/test-series/:seriesId/checkout ────────────────────────────────

export const checkoutSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const seriesId = req.params.seriesId as string;

    const series = await prisma.testSeries.findUnique({ where: { id: seriesId } });
    if (!series || !series.isActive) {
      return res.status(404).json({ status: "error", message: "Test series not found" });
    }

    const enrollment = await prisma.userSeriesEnrollment.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: { userId, seriesId },
      update: {},
    });

    res.json({
      status: "success",
      data: {
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        message: series.price === 0 ? "Enrolled successfully" : "Checkout initiated",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Test series enrollment not yet available" });
    }
    next(error);
  }
};

// ── GET /api/test-series/tests/:testId/questions ────────────────────────────

export const getTestQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const test = await prisma.testSeriesTest.findUnique({
      where: { id: testId, isPublished: true },
      include: {
        series: true,
        questions: {
          orderBy: { questionNum: "asc" },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    // Check enrollment
    const enrollment = await prisma.userSeriesEnrollment.findUnique({
      where: { userId_seriesId: { userId, seriesId: test.seriesId } },
    });

    if (!enrollment) {
      return res.status(403).json({ status: "error", message: "Not enrolled in this test series" });
    }

    // Return questions without correct options (for the test-taking flow)
    const questions = test.questions.map((q) => ({
      id: q.id,
      questionNum: q.questionNum,
      questionText: q.questionText,
      subject: q.subject,
      category: q.category,
      difficulty: q.difficulty,
      options: q.options,
    }));

    res.json({
      status: "success",
      data: {
        testId: test.id,
        title: test.title,
        examMode: test.examMode,
        duration: test.duration,
        totalMarks: test.totalMarks,
        questionCount: questions.length,
        questions,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }
    next(error);
  }
};

// ── POST /api/test-series/tests/:testId/submit ──────────────────────────────

export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers, timeTaken } = req.body;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ status: "error", message: "Answers are required" });
    }

    const test = await prisma.testSeriesTest.findUnique({
      where: { id: testId, isPublished: true },
      include: { questions: true, series: true },
    });

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    // Check enrollment
    const enrollment = await prisma.userSeriesEnrollment.findUnique({
      where: { userId_seriesId: { userId, seriesId: test.seriesId } },
    });

    if (!enrollment) {
      return res.status(403).json({ status: "error", message: "Not enrolled in this test series" });
    }

    // Calculate score
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const subjectWise: Record<string, { correct: number; wrong: number; total: number }> = {};

    for (const q of test.questions) {
      const selected = answers[q.id];
      const sw = subjectWise[q.subject] || { correct: 0, wrong: 0, total: 0 };
      sw.total++;

      if (!selected) {
        skippedCount++;
      } else if (selected === q.correctOption) {
        correctCount++;
        sw.correct++;
      } else {
        wrongCount++;
        sw.wrong++;
      }

      subjectWise[q.subject] = sw;
    }

    const score = correctCount * 2; // 2 marks per correct answer
    const totalMarks = test.questions.length * 2;
    const accuracy = test.questions.length > 0 ? (correctCount / test.questions.length) * 100 : 0;

    // Save attempt
    const attempt = await prisma.testSeriesAttempt.upsert({
      where: { userId_testId: { userId, testId } },
      create: {
        userId,
        testId,
        answers,
        score,
        totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy,
        timeTaken: timeTaken || 0,
        subjectWise,
        completedAt: new Date(),
      },
      update: {
        answers,
        score,
        totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy,
        timeTaken: timeTaken || 0,
        subjectWise,
        completedAt: new Date(),
      },
    });

    // Update enrollment progress
    const testNumber = test.testNumber;
    if (enrollment.testsCompleted < testNumber) {
      await prisma.userSeriesEnrollment.update({
        where: { id: enrollment.id },
        data: { testsCompleted: testNumber },
      });
    }

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        score,
        totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy,
        timeTaken: attempt.timeTaken,
        subjectWise,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Test submission not yet available" });
    }
    next(error);
  }
};

// ── GET /api/test-series/tests/:testId/result ───────────────────────────────

export const getTestResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const attempt = await prisma.testSeriesAttempt.findUnique({
      where: { userId_testId: { userId, testId } },
      include: {
        test: {
          include: { questions: { orderBy: { questionNum: "asc" } } },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found for this test" });
    }

    // Build question-wise results
    const questionResults = attempt.test.questions.map((q) => {
      const selected = (attempt.answers as any)?.[q.id];
      return {
        id: q.id,
        questionNum: q.questionNum,
        questionText: q.questionText,
        subject: q.subject,
        options: q.options,
        correctOption: q.correctOption,
        selectedOption: selected || null,
        isCorrect: selected === q.correctOption,
        explanation: q.explanation,
      };
    });

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        testId: attempt.testId,
        title: attempt.test.title,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        skippedCount: attempt.skippedCount,
        accuracy: attempt.accuracy,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
        questions: questionResults,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Result not found" });
    }
    next(error);
  }
};

// ── GET /api/test-series/tests/:testId/report ───────────────────────────────

export const getTestReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const attempt = await prisma.testSeriesAttempt.findUnique({
      where: { userId_testId: { userId, testId } },
      include: { test: true },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found for this test" });
    }

    // Get all attempts for this test to calculate percentile
    const allAttempts = await prisma.testSeriesAttempt.findMany({
      where: { testId },
      select: { accuracy: true },
    });

    let percentile = 50;
    if (allAttempts.length > 1) {
      const accuracies = allAttempts.map((a) => a.accuracy).sort((a, b) => a - b);
      const rank = accuracies.filter((a) => a < attempt.accuracy).length + 1;
      percentile = ((accuracies.length - rank + 1) / accuracies.length) * 100;
    }

    // Subject-wise breakdown
    const subjectWise = (attempt.subjectWise as Record<string, any>) || {};
    const subjectBreakdown = Object.entries(subjectWise).map(([subject, data]: [string, any]) => ({
      subject,
      correct: data.correct,
      wrong: data.wrong,
      total: data.total,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    }));

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        title: attempt.test.title,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        accuracy: attempt.accuracy,
        percentile: Math.round(percentile),
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
        subjectBreakdown,
        summary: {
          correct: attempt.correctCount,
          wrong: attempt.wrongCount,
          skipped: attempt.skippedCount,
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }
    next(error);
  }
};

// ── GET /api/test-series/tests/:testId/intelligence ─────────────────────────

export const getTestIntelligence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const attempt = await prisma.testSeriesAttempt.findUnique({
      where: { userId_testId: { userId, testId } },
      include: {
        test: {
          include: { questions: { orderBy: { questionNum: "asc" } } },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No attempt found for this test" });
    }

    // Identify strong and weak topics
    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    const answers = (attempt.answers as Record<string, string>) || {};

    for (const q of attempt.test.questions) {
      if (!subjectPerformance[q.subject]) {
        subjectPerformance[q.subject] = { correct: 0, total: 0 };
      }
      subjectPerformance[q.subject].total++;
      if (answers[q.id] === q.correctOption) {
        subjectPerformance[q.subject].correct++;
      }
    }

    const strongTopics: string[] = [];
    const weakTopics: string[] = [];

    for (const [subject, perf] of Object.entries(subjectPerformance)) {
      const accuracy = perf.total > 0 ? (perf.correct / perf.total) * 100 : 0;
      if (accuracy >= 70) strongTopics.push(subject);
      else if (accuracy < 40) weakTopics.push(subject);
    }

    // Time analysis
    const avgTimePerQuestion = attempt.timeTaken > 0 ? attempt.timeTaken / attempt.test.questions.length : 0;

    // Recommendations
    const recommendations: string[] = [];
    if (attempt.accuracy < 50) {
      recommendations.push("Focus on strengthening fundamentals in weak subjects");
    }
    if (attempt.skippedCount > attempt.test.questions.length * 0.3) {
      recommendations.push("Work on time management to attempt more questions");
    }
    if (weakTopics.length > 0) {
      recommendations.push(`Revise: ${weakTopics.join(", ")}`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Great performance! Keep maintaining consistency");
    }

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        strongTopics,
        weakTopics,
        subjectPerformance: Object.entries(subjectPerformance).map(([subject, perf]) => ({
          subject,
          accuracy: perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
          correct: perf.correct,
          total: perf.total,
        })),
        timeAnalysis: {
          totalTime: attempt.timeTaken,
          avgTimePerQuestion: Math.round(avgTimePerQuestion),
        },
        recommendations,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Intelligence report not found" });
    }
    next(error);
  }
};

// ── Helper ──────────────────────────────────────────────────────────────────

async function getAverageAccuracyForSeries(userId: string, seriesId: string): Promise<number> {
  const attempts = await prisma.testSeriesAttempt.findMany({
    where: {
      userId,
      test: { seriesId },
    },
    select: { accuracy: true },
  });

  if (attempts.length === 0) return 0;
  const total = attempts.reduce((sum, a) => sum + a.accuracy, 0);
  return Math.round((total / attempts.length) * 100) / 100;
}
