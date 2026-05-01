import prisma from "../config/database";
import type { DailyMCQRepository } from "./daily-mcq.repository";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
      await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: today, weekActivity },
      });
    },

    async updateStreak(userId, newStreak, longest, today, weekActivity) {
      await prisma.userStreak.upsert({
        where: { userId },
        create: { userId, currentStreak: newStreak, longestStreak: longest, lastActiveDate: today, weekActivity },
        update: { currentStreak: newStreak, longestStreak: longest, lastActiveDate: today, weekActivity },
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
