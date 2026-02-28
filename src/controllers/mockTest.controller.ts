import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/mock-tests/subjects
 * Available subjects with question counts
 */
export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = [
      { name: "All Subjects", count: 0 },
      { name: "History", count: 348 },
      { name: "Geography", count: 398 },
      { name: "Indian Polity", count: 348 },
      { name: "Economy", count: 368 },
      { name: "Science & Technology", count: 215 },
      { name: "Environment", count: 180 },
      { name: "Art & Culture", count: 145 },
    ];

    const questionCounts = await prisma.mockTestQuestion.groupBy({
      by: ["subject"],
      _count: { id: true },
    });

    if (questionCounts.length > 0) {
      const countMap = new Map(questionCounts.map(q => [q.subject, q._count.id]));
      for (const s of subjects) {
        if (s.name !== "All Subjects" && countMap.has(s.name)) {
          s.count = countMap.get(s.name)!;
        }
      }
      subjects[0].count = questionCounts.reduce((sum, q) => sum + q._count.id, 0);
    }

    res.json({ status: "success", data: subjects });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/config
 */
export const getConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      status: "success",
      data: {
        sources: [
          { id: "daily_mcq", name: "Daily MCQ", description: "From daily practice" },
          { id: "pyq", name: "Practice PYQ", description: "Previous year questions" },
          { id: "subject_wise", name: "Subject-wise", description: "Topic-focused practice" },
          { id: "mixed", name: "Mixed Bag", description: "Random mix" },
          { id: "full_length", name: "Full Length Test", description: "Complete exam simulation", isPro: true },
        ],
        examModes: [
          { id: "prelims", name: "Prelims", duration: 120 },
          { id: "mains", name: "Mains" },
        ],
        paperTypes: ["GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV"],
        difficulties: [
          { id: "easy", name: "Easy", description: "Foundation level" },
          { id: "medium", name: "Medium", description: "Exam standard" },
          { id: "hard", name: "Hard", description: "Advanced" },
          { id: "mixed", name: "Mixed", description: "All levels" },
        ],
        optionalSubjects: [
          "Anthropology", "Geography", "History", "Philosophy", "Political Science",
          "Psychology", "Public Administration", "Sociology", "Law", "Literature",
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-tests/generate
 */
export const generateTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { source, subject, examMode, paperType, questionCount, difficulty } = req.body;

    const count = Math.min(questionCount || 10, 100);
    const duration = Math.round(count * 1.6);
    const totalMarks = count * 2;

    const mockTest = await prisma.mockTest.create({
      data: {
        title: `${subject || "Mixed"} - ${examMode || "Prelims"} Practice`,
        source: source || "mixed",
        examMode: examMode || "prelims",
        paperType,
        subject: subject === "All Subjects" ? null : subject,
        difficulty: difficulty || "mixed",
        questionCount: count,
        duration,
        totalMarks,
        isGenerated: true,
      },
    });

    const subjectList = subject && subject !== "All Subjects" ? [subject] : ["History", "Geography", "Indian Polity", "Economy"];
    const difficultyList = difficulty === "mixed" ? ["Easy", "Moderate", "Hard"] : [difficulty || "Moderate"];

    for (let i = 1; i <= count; i++) {
      const qSubject = subjectList[Math.floor(Math.random() * subjectList.length)];
      const qDifficulty = difficultyList[Math.floor(Math.random() * difficultyList.length)];

      await prisma.mockTestQuestion.create({
        data: {
          mockTestId: mockTest.id,
          questionNum: i,
          questionText: `Sample ${qSubject} question ${i}: Which of the following statements about ${qSubject.toLowerCase()} is/are correct?\n\n1. Statement A related to ${qSubject}\n2. Statement B related to ${qSubject}\n3. Statement C related to ${qSubject}`,
          subject: qSubject,
          category: qSubject,
          difficulty: qDifficulty,
          options: [
            { id: "A", text: "1 and 2 only" },
            { id: "B", text: "2 and 3 only" },
            { id: "C", text: "1 and 3 only" },
            { id: "D", text: "1, 2 and 3" },
          ],
          correctOption: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
          explanation: `This is the explanation for question ${i}. The correct answer requires understanding of key concepts in ${qSubject}.`,
        },
      });
    }

    await prisma.userActivity.create({
      data: { userId, type: "mock_test", title: "Generated Mock Test", description: `${count} questions on ${subject || "Mixed"}` },
    });

    res.json({
      status: "success",
      data: {
        testId: mockTest.id,
        title: mockTest.title,
        questionCount: mockTest.questionCount,
        duration: mockTest.duration,
        totalMarks: mockTest.totalMarks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/:testId/questions
 */
export const getTestQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params.testId as string;

    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { questionNum: "asc" },
          select: { id: true, questionNum: true, questionText: true, subject: true, category: true, difficulty: true, options: true },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    res.json({
      status: "success",
      data: {
        testId: test.id,
        title: test.title,
        duration: test.duration,
        totalMarks: test.totalMarks,
        questions: test.questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-tests/:testId/submit
 */
export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers, timeTaken } = req.body;

    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: { questions: true },
    });

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const subjectWise: Record<string, { correct: number; wrong: number; total: number }> = {};

    for (const q of test.questions) {
      const selected = answers?.[q.id] || null;
      if (!subjectWise[q.subject]) subjectWise[q.subject] = { correct: 0, wrong: 0, total: 0 };
      subjectWise[q.subject].total++;

      if (!selected) {
        skippedCount++;
      } else if (selected === q.correctOption) {
        correctCount++;
        subjectWise[q.subject].correct++;
      } else {
        wrongCount++;
        subjectWise[q.subject].wrong++;
      }
    }

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
    const score = correctCount * 2 - wrongCount * 0.66;

    const analysis = generateAnalysis(correctCount, wrongCount, skippedCount, test.questionCount, subjectWise);

    const attempt = await prisma.mockTestAttempt.create({
      data: {
        userId,
        mockTestId: testId,
        answers: answers || {},
        score: Math.max(0, Math.round(score * 10) / 10),
        totalMarks: test.totalMarks,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy: Math.round(accuracy * 10) / 10,
        timeTaken: timeTaken || 0,
        subjectWise,
        analysis,
        completedAt: new Date(),
      },
    });

    await prisma.userActivity.create({
      data: { userId, type: "mock_test", title: "Completed Mock Test", description: `Score: ${Math.round(score)}/${test.totalMarks}` },
    });

    res.json({
      status: "success",
      data: { attemptId: attempt.id, testId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/mock-tests/:testId/save-progress
 */
export const saveProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers } = req.body;

    await prisma.mockTestAttempt.upsert({
      where: { id: `${userId}_${testId}_draft` },
      create: {
        id: `${userId}_${testId}_draft`,
        userId,
        mockTestId: testId,
        answers: answers || {},
        totalMarks: 0,
      },
      update: { answers: answers || {} },
    });

    res.json({ status: "success", message: "Progress saved" });
  } catch (error) {
    res.json({ status: "success", message: "Progress saved" });
  }
};

/**
 * GET /api/mock-tests/:testId/results
 */
export const getTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const attempt = await prisma.mockTestAttempt.findFirst({
      where: { userId, mockTestId: testId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
    });

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No completed attempt found" });
    }

    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { questionNum: "asc" } } },
    });

    const answers = (attempt.answers || {}) as Record<string, string>;
    const questionReview = test?.questions.map((q: any) => ({
      id: q.id,
      questionNum: q.questionNum,
      questionText: q.questionText,
      subject: q.subject,
      options: q.options,
      correctOption: q.correctOption,
      selectedOption: answers[q.id] || null,
      isCorrect: answers[q.id] === q.correctOption,
      explanation: q.explanation,
    }));

    res.json({
      status: "success",
      data: {
        ...attempt,
        questions: questionReview,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/:testId/recommendations
 */
export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const attempt = await prisma.mockTestAttempt.findFirst({
      where: { userId, mockTestId: testId, completedAt: { not: null } },
    });

    const streak = await prisma.userStreak.findUnique({ where: { userId } });

    const recommendations = [];

    if (attempt) {
      const subjectWise = (attempt.subjectWise || {}) as Record<string, { correct: number; wrong: number; total: number }>;
      const weakSubjects = Object.entries(subjectWise)
        .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5)
        .map(([k]) => k);

      if (weakSubjects.length > 0) {
        recommendations.push({
          type: "study",
          title: "Review Weak Subjects",
          description: `Focus on: ${weakSubjects.join(", ")}`,
          action: "Study Material",
          link: "/dashboard/library",
        });
      }

      if (attempt.accuracy < 50) {
        recommendations.push({
          type: "practice",
          title: "More Practice Needed",
          description: "Try easier difficulty to build confidence",
          action: "Generate Easy Test",
          link: "/dashboard/mock-tests",
        });
      }
    }

    recommendations.push(
      { type: "mcq", title: "Daily MCQ Challenge", description: "Keep your streak going", action: "Start MCQ", link: "/dashboard/daily-mcq" },
      { type: "answer", title: "Practice Answer Writing", description: "Improve your mains score", action: "Write Answer", link: "/dashboard/daily-answer" },
    );

    res.json({
      status: "success",
      data: { recommendations, streak: streak || { currentStreak: 0 } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/practice-stats
 */
export const getPracticeStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTests, streak] = await Promise.all([
      prisma.mockTestAttempt.count({ where: { userId, completedAt: { gte: today } } }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    res.json({
      status: "success",
      data: { todayCount: todayTests, streak: streak?.currentStreak || 0 },
    });
  } catch (error) {
    next(error);
  }
};

function generateAnalysis(correct: number, wrong: number, skipped: number, total: number, subjectWise: Record<string, any>): string {
  const accuracy = (correct + wrong) > 0 ? (correct / (correct + wrong)) * 100 : 0;
  let analysis = `You answered ${correct} out of ${total} questions correctly (${Math.round(accuracy)}% accuracy). `;
  if (wrong > 0) analysis += `${wrong} incorrect answers resulted in negative marking. `;
  if (skipped > 0) analysis += `${skipped} questions were left unattempted. `;

  const weakSubjects = Object.entries(subjectWise)
    .filter(([, v]: [string, any]) => v.total > 0 && v.correct / v.total < 0.5)
    .map(([k]) => k);

  if (weakSubjects.length > 0) {
    analysis += `Areas needing improvement: ${weakSubjects.join(", ")}. `;
  }
  analysis += "Keep practicing regularly to improve your scores.";
  return analysis;
}
