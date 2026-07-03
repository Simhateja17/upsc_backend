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
 * Study planner subject options (matches dashboard quick-add UX).
 * Keep this intentionally broader than VALID_UPSC_SUBJECTS.
 */
export const VALID_STUDY_PLANNER_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment & Ecology",
  "Science & Technology",
  "Current Affairs",
  "Society",
  "Governance",
  "International Relations",
  "Social Justice",
  "Agriculture",
  "Internal Security",
  "Disaster Management",
  "Ethics",
  "GS1",
  "GS2",
  "GS3",
  "GS4",
  "Essay",
  "Optional Paper 1",
  "Optional Paper 2",
] as const;

export type ValidStudyPlannerSubject = (typeof VALID_STUDY_PLANNER_SUBJECTS)[number];

export const VALID_STUDY_PLANNER_SUBJECT_SET = new Set(VALID_STUDY_PLANNER_SUBJECTS);

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

/**
 * Normalize study planner specific aliases.
 */
export function normalizeStudyPlannerSubject(subject: string): string {
  const normalized = normalizeSubject(subject);
  const s = normalized.trim();
  const lower = s.toLowerCase().replace(/\s+/g, " ");

  if (lower === "optional paper i" || lower === "optional paper-1") {
    return "Optional Paper 1";
  }
  if (lower === "optional paper ii" || lower === "optional paper-2") {
    return "Optional Paper 2";
  }
  if (lower === "gs 1") return "GS1";
  if (lower === "gs 2") return "GS2";
  if (lower === "gs 3") return "GS3";
  if (lower === "gs 4") return "GS4";

  // Direct match for planner enum (case-insensitive)
  const exact = VALID_STUDY_PLANNER_SUBJECTS.find((v) => v.toLowerCase() === lower);
  if (exact) return exact;

  return s;
}

export function isValidStudyPlannerSubject(subject: string | null | undefined): boolean {
  if (!subject) return false;
  return VALID_STUDY_PLANNER_SUBJECT_SET.has(subject as ValidStudyPlannerSubject);
}
