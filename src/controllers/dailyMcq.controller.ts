import { Request, Response, NextFunction } from "express";
import { dailyMcqRepo } from "../repositories/prisma-daily-mcq.repository";
import { isValidSubject } from "../constants/subjects";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekActivity(today: Date): boolean[] {
  const dayOfWeek = today.getDay();
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const activity = [false, false, false, false, false, false, false];
  activity[mondayIndex] = true;
  return activity;
}

async function getOrCreateTodayMCQ() {
  let mcq = await dailyMcqRepo.findTodayMCQ();
  if (!mcq) {
    console.log("[Daily MCQ] No MCQ for today — generating on the fly...");
    await dailyMcqRepo.createTodayMCQ();
    mcq = await dailyMcqRepo.findTodayMCQ();
  }
  return mcq;
}

export const getTodayMCQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mcq = await getOrCreateTodayMCQ();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });

    const attempt = await dailyMcqRepo.checkUserAttempt(req.user!.id, mcq.id);
    const attempted = !!attempt?.completedAt;
    const { id, title, topic, tags, questionCount, timeLimit, totalMarks } = mcq;

    res.json({ status: "success", data: { id, title, topic, tags, questionCount, timeLimit, totalMarks, attempted } });
  } catch (error) {
    next(error);
  }
};

export const getTodayQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mcq = await getOrCreateTodayMCQ();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });

    const questions = (await dailyMcqRepo.findQuestions(mcq.id, true)).filter((q: any) => isValidSubject(q.category));
    res.json({ status: "success", data: { mcqId: mcq.id, timeLimit: mcq.timeLimit, totalMarks: mcq.totalMarks, questions } });
  } catch (error) {
    next(error);
  }
};

export const submitMCQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { answers, timeTaken } = req.body;

    const mcq = await dailyMcqRepo.findTodayWithQuestions();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ challenge available for today" });

    const existing = await dailyMcqRepo.checkUserAttempt(userId, mcq.id);
    if (existing?.completedAt) return res.status(400).json({ status: "error", message: "You have already submitted today's MCQ" });

    // Score answers
    const questionMap = new Map(mcq.questions.map((q: any) => [q.id, q]));
    let correctCount = 0, wrongCount = 0, skippedCount = 0;
    const topicResults: Record<string, { correct: number; total: number }> = {};
    const responseData: Array<{ questionId: string; selectedOption: string | null; isCorrect: boolean | null; timeTaken: number }> = [];

    for (const q of mcq.questions) {
      const answer = answers?.find((a: any) => a.questionId === q.id);
      const selected = answer?.selectedOption || null;
      const isCorrect = selected ? selected === q.correctOption : null;

      if (!selected) skippedCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      if (!topicResults[q.category]) topicResults[q.category] = { correct: 0, total: 0 };
      topicResults[q.category].total++;
      if (isCorrect) topicResults[q.category].correct++;

      responseData.push({ questionId: q.id, selectedOption: selected, isCorrect, timeTaken: answer?.timeTaken || 0 });
    }

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
    const score = correctCount * (mcq.totalMarks / mcq.questionCount);

    const strongTopics = Object.entries(topicResults).filter(([k, v]) => isValidSubject(k) && v.total > 0 && v.correct / v.total >= 0.7).map(([k]) => k);
    const weakTopics = Object.entries(topicResults).filter(([k, v]) => isValidSubject(k) && v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k);

    const attempt = await dailyMcqRepo.upsertAttempt({
      userId, dailyMcqId: mcq.id,
      score: Math.round(score * 10) / 10, totalMarks: mcq.totalMarks,
      correctCount, wrongCount, skippedCount,
      accuracy: Math.round(accuracy * 10) / 10, timeTaken: timeTaken || 0,
      strongTopics, weakTopics, completedAt: new Date(),
    });

    for (const r of responseData) {
      await dailyMcqRepo.upsertResponse({ attemptId: attempt.id, ...r });
    }

    await dailyMcqRepo.createActivity({
      userId, type: "mcq", title: "Completed Daily MCQ",
      description: `Scored ${correctCount}/${mcq.questionCount} (${Math.round(accuracy)}%)`,
    });

    await dailyMcqRepo.getOrCreateStreak(userId, getWeekActivity(new Date()));

    res.json({
      status: "success",
      data: { attemptId: attempt.id, score: attempt.score, totalMarks: attempt.totalMarks, correctCount, wrongCount, skippedCount, accuracy: attempt.accuracy, timeTaken: attempt.timeTaken, strongTopics, weakTopics },
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const mcq = await dailyMcqRepo.findTodayMCQ();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ challenge for today" });

    const attempt = await dailyMcqRepo.findAttempt(userId, mcq.id);
    if (!attempt) return res.status(404).json({ status: "error", message: "No attempt found for today" });

    const higherCount = await dailyMcqRepo.countHigherScores(mcq.id, attempt.score);
    const totalAttempts = await dailyMcqRepo.countTotalAttempts(mcq.id);
    const rank = higherCount + 1;
    const percentile = totalAttempts > 0 ? ((totalAttempts - higherCount) / totalAttempts) * 100 : 0;

    res.json({
      status: "success",
      data: { ...attempt, rank, percentile: Math.round(percentile), totalParticipants: totalAttempts, questionCount: mcq.questionCount },
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const mcq = await dailyMcqRepo.findTodayWithQuestions();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ challenge for today" });

    const attempt = await dailyMcqRepo.findAttemptWithResponses(userId, mcq.id);
    if (!attempt) return res.status(404).json({ status: "error", message: "No attempt found" });

    const responseMap = new Map<string, any>(attempt.responses.map((r: any) => [r.questionId, r]));
    const reviewData = mcq.questions
      .filter((q: any) => isValidSubject(q.category))
      .map((q: any) => {
        const response = responseMap.get(q.id);
        return { id: q.id, questionNum: q.questionNum, questionText: q.questionText, category: q.category, difficulty: q.difficulty, options: q.options, correctOption: q.correctOption, explanation: q.explanation, selectedOption: response?.selectedOption || null, isCorrect: response?.isCorrect || false };
      });

    res.json({ status: "success", data: { questions: reviewData } });
  } catch (error) {
    next(error);
  }
};

export const getTodayRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const mcq = await dailyMcqRepo.findTodayMCQ();
    if (!mcq) return res.status(404).json({ status: "error", message: "No MCQ for today" });

    const attempt = await dailyMcqRepo.findAttempt(userId, mcq.id);
    const recommendations: any[] = [];

    if (attempt) {
      if (attempt.weakTopics.length > 0) {
        const topicsParam = encodeURIComponent(attempt.weakTopics.join(","));
        recommendations.push({ type: "study", title: "Review Weak Areas", description: `Focus on: ${attempt.weakTopics.join(", ")}`, action: "Practice Weak Areas", link: `/dashboard/daily-mcq/practice?topics=${topicsParam}` });
      }
      if (attempt.accuracy < 60) {
        recommendations.push({ type: "practice", title: "Practice More MCQs", description: "Build your accuracy with subject-wise practice", action: "Start Mock Test", link: "/dashboard/mock-tests" });
      }
      recommendations.push({ type: "editorial", title: "Read Today's Editorial", description: "Stay updated with current affairs analysis", action: "Read Editorials", link: "/dashboard/daily-editorial" });
      recommendations.push({ type: "answer", title: "Practice Answer Writing", description: "Attempt today's mains question", action: "Write Answer", link: "/dashboard/daily-answer" });
    }

    res.json({ status: "success", data: { recommendations } });
  } catch (error) {
    next(error);
  }
};

export const getPracticeQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const topicsParam = req.query.topics as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    let topics: string[] = [];
    if (topicsParam) topics = topicsParam.split(",").map((t) => t.trim()).filter(Boolean);

    if (topics.length === 0) {
      const latestAttempt = await dailyMcqRepo.findLatestAttempt(userId);
      if (latestAttempt?.weakTopics.length) topics = latestAttempt.weakTopics;
    }

    if (topics.length === 0) return res.status(400).json({ status: "error", message: "No topics provided and no weak topics found" });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const questions = (await dailyMcqRepo.findQuestionsByTopics(topics, cutoff, limit * 3)).filter((q: any) => isValidSubject(q.category));
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, limit);

    res.json({ status: "success", data: { topics, questionCount: shuffled.length, questions: shuffled } });
  } catch (error) {
    next(error);
  }
};
