import prisma from "../../config/database";
import { getPerformance } from "../dashboard.service";

/**
 * A single snapshot of every real user signal the badge evaluators need.
 * Built once per achievements request and passed to each badge's `evaluate`.
 *
 * Fields are sourced from two places:
 *  - `getPerformance(userId)` (dashboard aggregation) for streak / syllabus /
 *    attempt counts that are already computed there.
 *  - direct Prisma counts below for signals the dashboard doesn't expose.
 *
 * Signals that the platform does not yet track (video-lecture watch progress,
 * study-material reads, analytics-view events, per-feature daily streaks, etc.)
 * are intentionally absent — the badges that would need them are registered in
 * the catalog with `supported: false` and never read this context.
 */
export interface BadgeContext {
  currentStreak: number;
  syllabusCoverage: number; // percent 0-100
  polityCoverage: number; // percent 0-100
  caReads: number;
  testSeriesAttempts: number;
  testSeriesBestAccuracy: number; // percent 0-100
  mockAttempts: number;
  mcqAttempts: number;
  mcqPerfect: boolean;
  questionsAttempted: number;
  mainsAttempts: number;
  pyqPrelimsSolved: number;
  flashcardsEngaged: number;
  mindmapsViewed: number;
  srItemsReviewed: number;
  srDistinctSubjects: number;
  forumHelpful: number;
}

/** Answers count as "helpful" when accepted or when they have net up-votes. */
const FORUM_HELPFUL_MIN_VOTES = 3;

export async function buildBadgeContext(userId: string): Promise<BadgeContext> {
  const [
    perf,
    caReads,
    testSeriesAgg,
    mcqPerfectAgg,
    pyqPrelimsSolved,
    flashcardsEngaged,
    mindmapsViewed,
    srReviewed,
    srSubjectGroups,
    forumHelpful,
  ] = await Promise.all([
    getPerformance(userId),
    prisma.editorialProgress.count({ where: { userId, isRead: true } }),
    prisma.testSeriesAttempt.aggregate({ where: { userId }, _max: { accuracy: true } }),
    prisma.mCQAttempt.aggregate({ where: { userId }, _max: { accuracy: true } }),
    prisma.pyqPrelimsAttempt.count({ where: { userId } }),
    prisma.userFlashcardProgress.count({ where: { userId } }),
    prisma.userMindmapProgress.count({ where: { userId, viewed: true } }),
    prisma.spacedRepItem.count({ where: { userId, repetitions: { gt: 0 } } }),
    prisma.spacedRepItem.groupBy({
      by: ["subject"],
      where: { userId, repetitions: { gt: 0 } },
    }),
    prisma.forumAnswer.count({
      where: { userId, OR: [{ isAccepted: true }, { votes: { gte: FORUM_HELPFUL_MIN_VOTES } }] },
    }),
  ]);

  return {
    currentStreak: perf.streak?.currentStreak ?? 0,
    syllabusCoverage: perf.syllabusCoverage,
    polityCoverage: perf.polityCoverage,
    caReads,
    testSeriesAttempts: perf.testSeries.totalAttempts,
    testSeriesBestAccuracy: testSeriesAgg._max.accuracy ?? 0,
    mockAttempts: perf.mockTests.totalAttempts,
    mcqAttempts: perf.mcq.totalAttempts,
    mcqPerfect: (mcqPerfectAgg._max.accuracy ?? 0) >= 100,
    questionsAttempted: perf.questionsAttempted,
    mainsAttempts: perf.mains.dailyAnswerAttempts,
    pyqPrelimsSolved,
    flashcardsEngaged,
    mindmapsViewed,
    srItemsReviewed: srReviewed,
    srDistinctSubjects: srSubjectGroups.length,
    forumHelpful,
  };
}
