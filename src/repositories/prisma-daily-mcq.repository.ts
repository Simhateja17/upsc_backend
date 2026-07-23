import prisma from "../config/database";
import type { DailyMCQRepository } from "./daily-mcq.repository";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameWeek(a: Date | null, b: Date): boolean {
  if (!a) return false;
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

function getMondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function buildCurrentWeekActivity(today: Date, currentStreak: number, existing?: unknown): boolean[] {
  const activity = Array.isArray(existing) && existing.length === 7
    ? existing.map(Boolean)
    : [false, false, false, false, false, false, false];
  const weekStart = getWeekStart(today);
  const daysToMark = Math.max(1, currentStreak);

  for (let offset = 0; offset < daysToMark; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < weekStart.getTime()) break;
    activity[getMondayIndex(d)] = true;
  }

  return activity;
}

export function createPrismaDailyMCQRepository(): DailyMCQRepository {
  return {
    async findTodayMCQ() {
      const today = getToday();
      return prisma.dailyMCQ.findUnique({ where: { date: today } });
    },

    async createTodayMCQ() {
      const { ensureTodayMCQ } = await import("../jobs/dailyContentJob");
      await ensureTodayMCQ();
    },

    async findTodayWithQuestions() {
      const today = getToday();
      return prisma.dailyMCQ.findUnique({
        where: { date: today },
        include: { questions: true },
      });
    },

    async checkUserAttempt(userId, mcqId) {
      return prisma.mCQAttempt.findUnique({
        where: { userId_dailyMcqId: { userId, dailyMcqId: mcqId } },
      });
    },

    async findQuestions(mcqId, includeAnswers) {
      return prisma.mCQQuestion.findMany({
        where: { dailyMcqId: mcqId },
        orderBy: { questionNum: "asc" },
        select: includeAnswers
          ? { id: true, questionNum: true, questionText: true, category: true, difficulty: true, options: true, correctOption: true, explanation: true }
          : { id: true, questionNum: true, questionText: true, category: true, difficulty: true, options: true },
      });
    },

    async upsertAttempt(data) {
      return prisma.mCQAttempt.upsert({
        where: { userId_dailyMcqId: { userId: data.userId, dailyMcqId: data.dailyMcqId } },
        create: data,
        update: {
          score: data.score,
          correctCount: data.correctCount,
          wrongCount: data.wrongCount,
          skippedCount: data.skippedCount,
          accuracy: data.accuracy,
          timeTaken: data.timeTaken,
          strongTopics: data.strongTopics,
          weakTopics: data.weakTopics,
          completedAt: data.completedAt,
        },
      });
    },

    async upsertResponse(data) {
      await prisma.mCQResponse.upsert({
        where: { attemptId_questionId: { attemptId: data.attemptId, questionId: data.questionId } },
        create: data,
        update: { selectedOption: data.selectedOption, isCorrect: data.isCorrect, timeTaken: data.timeTaken },
      });
    },

    async createActivity(data) {
      await prisma.userActivity.create({ data });
    },

    async getOrCreateStreak(userId, weekActivity) {
      const today = getToday();
      const streak = await prisma.userStreak.findUnique({ where: { userId } });
      if (!streak) {
        await prisma.userStreak.create({
          data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, weekActivity },
        });
        return;
      }
      const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
      if (lastActive) lastActive.setHours(0, 0, 0, 0);
      if (lastActive?.getTime() === today.getTime()) return;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastActive?.getTime() === yesterday.getTime();
      const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
      const newLongest = Math.max(newStreak, streak.longestStreak);
      const nextWeekActivity = isSameWeek(lastActive, today)
        ? buildCurrentWeekActivity(today, newStreak, streak.weekActivity)
        : weekActivity;
      await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: today, weekActivity: nextWeekActivity },
      });
    },

    async updateStreak(userId, newStreak, longest, today, weekActivity) {
      const streak = await prisma.userStreak.findUnique({ where: { userId } });
      const lastActive = streak?.lastActiveDate ? new Date(streak.lastActiveDate) : null;
      if (lastActive) lastActive.setHours(0, 0, 0, 0);
      const nextWeekActivity = streak && isSameWeek(lastActive, today)
        ? buildCurrentWeekActivity(today, newStreak, streak.weekActivity)
        : weekActivity;
      await prisma.userStreak.upsert({
        where: { userId },
        create: { userId, currentStreak: newStreak, longestStreak: longest, lastActiveDate: today, weekActivity: nextWeekActivity },
        update: { currentStreak: newStreak, longestStreak: longest, lastActiveDate: today, weekActivity: nextWeekActivity },
      });
    },

    async findAttempt(userId, mcqId) {
      return prisma.mCQAttempt.findUnique({
        where: { userId_dailyMcqId: { userId, dailyMcqId: mcqId } },
      });
    },

    async countHigherScores(mcqId, score) {
      return prisma.mCQAttempt.count({
        where: { dailyMcqId: mcqId, score: { gt: score } },
      });
    },

    async countTotalAttempts(mcqId) {
      return prisma.mCQAttempt.count({ where: { dailyMcqId: mcqId } });
    },

    async findAttemptWithResponses(userId, mcqId) {
      return prisma.mCQAttempt.findUnique({
        where: { userId_dailyMcqId: { userId, dailyMcqId: mcqId } },
        include: { responses: true },
      });
    },

    async findLatestAttempt(userId) {
      return prisma.mCQAttempt.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    },

    async findUserHistory(userId, limit) {
      return prisma.mCQAttempt.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: limit,
        include: { dailyMcq: { select: { title: true, topic: true, date: true, questionCount: true } } },
      });
    },

    async findQuestionsByTopics(topics, cutoff, limit) {
      return prisma.mCQQuestion.findMany({
        where: { category: { in: topics }, dailyMcq: { date: { gte: cutoff } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true, questionNum: true, questionText: true, category: true,
          difficulty: true, options: true, correctOption: true, explanation: true,
        },
      });
    },
  };
}

export const dailyMcqRepo = createPrismaDailyMCQRepository();
