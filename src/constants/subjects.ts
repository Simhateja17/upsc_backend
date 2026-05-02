/**
 * Canonical UPSC subjects derived from the official Prelims syllabus CSV.
 * These 6 subjects are the ONLY valid subjects for most features.
 * Mock Tests, PYQs, and Test Series are EXEMPT from this restriction.
 */
export const VALID_UPSC_SUBJECTS = [
  "History",
  "Geography",
  "Polity",
  "Economy",
  "Environment & Ecology",
  "Science & Technology",
] as const;

export type ValidUpscSubject = (typeof VALID_UPSC_SUBJECTS)[number];

export const VALID_SUBJECT_SET = new Set(VALID_UPSC_SUBJECTS);

/**
 * Check if a subject string is one of the 6 canonical subjects.
 */
export function isValidSubject(subject: string | null | undefined): boolean {
  if (!subject) return false;
  return VALID_SUBJECT_SET.has(subject as ValidUpscSubject);
}

/**
 * Normalize common aliases to canonical names.
 */
export function normalizeSubject(subject: string): string {
  const s = subject.trim();
  const lower = s.toLowerCase();

  // Environment aliases
  if (lower === "environment" || lower === "env" || lower === "environment and ecology") {
    return "Environment & Ecology";
  }

  // Science & Tech aliases
  if (lower === "science & tech" || lower === "science and tech" || lower === "science and technology" || lower === "s&t" || lower === "sci-tech") {
    return "Science & Technology";
  }

  // Direct match
  const exact = VALID_UPSC_SUBJECTS.find((v) => v.toLowerCase() === lower);
  if (exact) return exact;

  return s;
}
