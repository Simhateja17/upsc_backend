/**
 * Single source of truth for the UPSC Mains marking & timing pattern.
 *
 *   10 marker → ~150 words → ~7 min
 *   15 marker → ~200 words → ~11 min
 *   20 marker → ~250 words → ~14 min
 *
 * This is surfaced to the student on the test-builder screen, used to
 * constrain the AI-generated model answer's length, and used by the evaluator
 * to penalise answers that fall outside the band. Every consumer must read
 * these helpers rather than re-deriving the numbers, so the number the student
 * is shown is always the number the examiner grades against.
 */

export interface MainsPatternRow {
  marks: number;
  words: number;
  minutes: number;
}

export const MAINS_PATTERN: MainsPatternRow[] = [
  { marks: 10, words: 150, minutes: 7 },
  { marks: 15, words: 200, minutes: 11 },
  { marks: 20, words: 250, minutes: 14 },
];

/** Expected answer length, in words, for a question worth `marks`. */
export function mainsWordLimit(marks: number): number {
  if (marks >= 20) return 250;
  if (marks >= 15) return 200;
  if (marks >= 10) return 150;
  // Sub-10-mark questions aren't part of the official pattern; scale down
  // proportionally on the 15-words-per-mark slope, with a sane floor.
  return Math.max(80, Math.round(marks * 15));
}

/** Suggested time budget, in minutes, for a question worth `marks`. */
export function mainsTimeLimit(marks: number): number {
  if (marks >= 20) return 14;
  if (marks >= 15) return 11;
  if (marks >= 10) return 7;
  return Math.max(4, Math.round(marks * 0.7));
}

/**
 * Tolerance band around the word limit. UPSC examiners allow a little slack,
 * but a wildly long answer is penalised for padding and a very short one for
 * insufficient content — so the band is asymmetric and deliberately tight on
 * the upper side, where students most often over-write.
 */
export const WORD_LIMIT_OVER_TOLERANCE = 1.1; // >110% of the limit is "over"
export const WORD_LIMIT_UNDER_TOLERANCE = 0.7; // <70% of the limit is "under"

export type WordCountStatus = "within" | "over" | "under";

export function wordCountStatus(wordCount: number, marks: number): WordCountStatus {
  const limit = mainsWordLimit(marks);
  if (wordCount > limit * WORD_LIMIT_OVER_TOLERANCE) return "over";
  if (wordCount < limit * WORD_LIMIT_UNDER_TOLERANCE) return "under";
  return "within";
}

/** Inclusive acceptable word range for a question worth `marks`. */
export function mainsWordRange(marks: number): { limit: number; min: number; max: number } {
  const limit = mainsWordLimit(marks);
  return {
    limit,
    min: Math.round(limit * WORD_LIMIT_UNDER_TOLERANCE),
    max: Math.round(limit * WORD_LIMIT_OVER_TOLERANCE),
  };
}
