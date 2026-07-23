import type { BadgeContext } from "./badgeContext";

export type BadgeCategoryKey =
  | "streak"
  | "learning"
  | "practice"
  | "revision"
  | "analytics"
  | "community";

export interface BadgeEvaluation {
  earned: boolean;
  current: number;
  target: number;
}

export interface BadgeDefinition {
  key: string;
  categoryKey: BadgeCategoryKey;
  tag: string;
  /**
   * Whether the platform tracks the signal this badge needs today. Unsupported
   * badges can never be earned (they always evaluate to locked) but stay in the
   * catalog so the frontend renders them and so each can go live by flipping
   * this flag + adding an evaluator once tracking exists.
   */
  supported: boolean;
  evaluate: (ctx: BadgeContext) => BadgeEvaluation;
}

/** Helper: a threshold badge — earned when `current >= target`. */
function threshold(
  current: (ctx: BadgeContext) => number,
  target: number,
): (ctx: BadgeContext) => BadgeEvaluation {
  return (ctx) => {
    const c = current(ctx);
    return { earned: c >= target, current: c, target };
  };
}

/** Helper: a boolean badge — earned when the predicate holds. */
function flag(
  predicate: (ctx: BadgeContext) => boolean,
): (ctx: BadgeContext) => BadgeEvaluation {
  return (ctx) => {
    const ok = predicate(ctx);
    return { earned: ok, current: ok ? 1 : 0, target: 1 };
  };
}

/** Evaluator for badges whose signal isn't tracked yet — always locked. */
const notTrackable = (): BadgeEvaluation => ({ earned: false, current: 0, target: 0 });

export const BADGE_CATALOG: BadgeDefinition[] = [
  // ==================== STREAK & CONSISTENCY ====================
  { key: "first-light", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 1) },
  { key: "three-in-a-row", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 3) },
  { key: "ignition", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 7) },
  { key: "iron-discipline", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 14) },
  { key: "the-grind", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 30) },
  { key: "rise-365", categoryKey: "streak", tag: "STREAK", supported: true, evaluate: threshold((c) => c.currentStreak, 365) },
  // Needs streak-break history — not tracked yet.
  { key: "comeback-king", categoryKey: "streak", tag: "STREAK", supported: false, evaluate: notTrackable },
  // Needs per-day daily-task completion snapshot — not tracked yet.
  { key: "perfect-week", categoryKey: "streak", tag: "STREAK", supported: false, evaluate: notTrackable },

  // ==================== LEARNING ====================
  // Needs video-lecture watch progress — not tracked yet.
  { key: "first-lecture", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "jeet-student", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "subject-conqueror", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "century-scholar", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "daily-briefing", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: threshold((c) => c.caReads, 1) },
  // Needs a per-day Current-Affairs read streak — not tracked yet.
  { key: "current-weekly", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "world-watcher", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: threshold((c) => c.caReads, 100) },
  { key: "always-informed", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  // Needs study-material read tracking — not tracked yet.
  { key: "page-turner", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "deep-reader", categoryKey: "learning", tag: "LEARNING", supported: false, evaluate: notTrackable },
  { key: "constitution-keeper", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: threshold((c) => c.polityCoverage, 100) },
  { key: "prelims-ready", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: threshold((c) => c.syllabusCoverage, 100) },
  { key: "mapped-out", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: flag((c) => c.syllabusCoverage > 0) },
  { key: "quarter-done", categoryKey: "learning", tag: "LEARNING", supported: true, evaluate: threshold((c) => c.syllabusCoverage, 25) },

  // ==================== PRACTICE ====================
  { key: "test-debut", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.testSeriesAttempts, 1) },
  { key: "question-crusher", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.testSeriesBestAccuracy, 80) },
  { key: "ten-battles", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mockAttempts, 10) },
  // Needs a real mock-test leaderboard rank — not reliably tracked yet.
  { key: "rank-list-bound", categoryKey: "practice", tag: "PRACTICE", supported: false, evaluate: notTrackable },
  { key: "first-attempt", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mcqAttempts, 1) },
  { key: "perfect-ten", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: flag((c) => c.mcqPerfect) },
  { key: "century-club", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.questionsAttempted, 100) },
  // Needs a per-day MCQ streak — not tracked yet.
  { key: "mcq-marathon", categoryKey: "practice", tag: "PRACTICE", supported: false, evaluate: notTrackable },
  { key: "pen-drawn", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mainsAttempts, 1) },
  { key: "mains-rising", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mainsAttempts, 10) },
  { key: "word-smith", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mainsAttempts, 50) },
  { key: "answer-century", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.mainsAttempts, 100) },
  { key: "archive-opener", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.pyqPrelimsSolved, 1) },
  { key: "pattern-cracker", categoryKey: "practice", tag: "PRACTICE", supported: true, evaluate: threshold((c) => c.pyqPrelimsSolved, 50) },
  // Needs PYQ-by-year completion tracking — not tracked yet.
  { key: "pyq-perfectionist", categoryKey: "practice", tag: "PRACTICE", supported: false, evaluate: notTrackable },
  { key: "decade-diver", categoryKey: "practice", tag: "PRACTICE", supported: false, evaluate: notTrackable },

  // ==================== REVISION ====================
  { key: "flash-pro", categoryKey: "revision", tag: "REVISION", supported: true, evaluate: threshold((c) => c.flashcardsEngaged, 50) },
  // Needs a per-day flashcard-review streak — not tracked yet.
  { key: "review-streak", categoryKey: "revision", tag: "REVISION", supported: false, evaluate: notTrackable },
  { key: "card-master", categoryKey: "revision", tag: "REVISION", supported: true, evaluate: threshold((c) => c.flashcardsEngaged, 200) },
  { key: "mind-mapper", categoryKey: "revision", tag: "REVISION", supported: true, evaluate: threshold((c) => c.mindmapsViewed, 1) },
  // Mindmaps are platform content (users don't build multi-level maps) — not trackable.
  { key: "web-weaver", categoryKey: "revision", tag: "REVISION", supported: false, evaluate: notTrackable },
  { key: "recall-champion", categoryKey: "revision", tag: "REVISION", supported: true, evaluate: threshold((c) => c.srItemsReviewed, 1) },
  // Needs a multi-week spaced-repetition streak — not tracked yet.
  { key: "memory-builder", categoryKey: "revision", tag: "REVISION", supported: false, evaluate: notTrackable },
  { key: "retention-expert", categoryKey: "revision", tag: "REVISION", supported: true, evaluate: threshold((c) => c.srDistinctSubjects, 5) },

  // ==================== ANALYTICS ====================
  // All four need analytics-view / trend-history events — none tracked yet.
  { key: "data-driven", categoryKey: "analytics", tag: "ANALYTICS", supported: false, evaluate: notTrackable },
  { key: "trend-watcher", categoryKey: "analytics", tag: "ANALYTICS", supported: false, evaluate: notTrackable },
  { key: "consistent-growth", categoryKey: "analytics", tag: "ANALYTICS", supported: false, evaluate: notTrackable },
  { key: "all-green", categoryKey: "analytics", tag: "ANALYTICS", supported: false, evaluate: notTrackable },

  // ==================== COMMUNITY ====================
  // Leaderboard rank isn't a reliable persisted signal yet.
  { key: "top-10", categoryKey: "community", tag: "COMMUNITY", supported: false, evaluate: notTrackable },
  { key: "top-of-the-board", categoryKey: "community", tag: "COMMUNITY", supported: false, evaluate: notTrackable },
  { key: "peer-mentor", categoryKey: "community", tag: "COMMUNITY", supported: true, evaluate: threshold((c) => c.forumHelpful, 5) },
  { key: "forum-expert", categoryKey: "community", tag: "COMMUNITY", supported: true, evaluate: threshold((c) => c.forumHelpful, 25) },
];

export const BADGE_KEYS = new Set(BADGE_CATALOG.map((b) => b.key));
