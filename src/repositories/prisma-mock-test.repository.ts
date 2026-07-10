import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import type { MockTestRepository } from "./mock-test.repository";

type Difficulty = "Easy" | "Medium" | "Hard";

function normalizeDifficulty(value: string): Difficulty | "Mixed" {
  const normalized = String(value || "mixed").trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "medium") return "Medium";
  if (normalized === "hard") return "Hard";
  return "Mixed";
}

function mixedDifficultyCounts(count: number): Record<Difficulty, number> {
  const base = {
    Easy: Math.floor(count * 0.5),
    Medium: Math.floor(count * 0.3),
    Hard: Math.floor(count * 0.2),
  };
  let used = base.Easy + base.Medium + base.Hard;
  const fractions = [
    ["Easy", count * 0.5 - base.Easy],
    ["Medium", count * 0.3 - base.Medium],
    ["Hard", count * 0.2 - base.Hard],
  ] as Array<[Difficulty, number]>;
  fractions.sort((a, b) => b[1] - a[1]);
  let idx = 0;
  while (used < count) {
    base[fractions[idx % fractions.length][0]]++;
    used++;
    idx++;
  }
  return base;
}

function subjectPatterns(subject?: string): string[] {
  const value = String(subject || "").trim();
  if (!value || value === "All Subjects") return [];
  const lower = value.toLowerCase();
  if (lower.includes("history")) return ["%History%"];
  if (lower.includes("environment")) return ["%Environment%"];
  if (lower.includes("science")) return ["%Science%"];
  if (lower.includes("international")) return ["%International%"];
  return [`%${value}%`];
}

function toMockQuestionFromBank(row: any) {
  return {
    sourceQuestionBankId: row.id,
    questionText: row.question_text,
    options: row.options || [],
    correctOption: row.correct_option || "A",
    subject: row.subject,
    category: row.subject,
    difficulty: row.difficulty || "Medium",
    explanation: row.explanation || "",
  };
}

// Mains "paper" is stored differently across tables: the curated bank uses
// "GS-I".."GS-IV", daily_mains_questions uses the display form
// "GS Paper I".."GS Paper IV", and the frontend sends "gs1".."gs4".
// Normalize once here so callers can match exactly instead of pattern-matching
// (roman numerals share suffixes — "I"/"II"/"III" all end in "I" — so a LIKE
// match on a suffix would silently over-match).
function mainsPaperCode(paperType?: string): string | null {
  const raw = String(paperType || "").trim().toLowerCase();
  const map: Record<string, string> = { gs1: "GS-I", gs2: "GS-II", gs3: "GS-III", gs4: "GS-IV" };
  return map[raw] || null;
}

function mainsPaperDisplay(paperType?: string): string | null {
  const raw = String(paperType || "").trim().toLowerCase();
  const map: Record<string, string> = {
    gs1: "GS Paper I",
    gs2: "GS Paper II",
    gs3: "GS Paper III",
    gs4: "GS Paper IV",
  };
  return map[raw] || null;
}

function toMockMainsQuestion(row: {
  sourceQuestionBankId: string | null;
  questionText: string;
  subject: string;
  marks: number | null;
  difficulty?: string | null;
}) {
  return {
    sourceQuestionBankId: row.sourceQuestionBankId,
    questionText: row.questionText,
    subject: row.subject,
    category: row.subject,
    difficulty: row.difficulty || "Medium",
    explanation: "",
    marks: row.marks && row.marks > 0 ? row.marks : 15,
  };
}

export function createPrismaMockTestRepository(): MockTestRepository {
  return {
    async getSubjectCounts() {
      const [{ data: pyqRows }, { data: studySubjects }, { data: mockSubjects }] = await Promise.all([
        supabaseAdmin.from("pyq_question_bank").select("subject").eq("exam", "prelims").eq("status", "approved").eq("paper", "GS-I"),
        supabaseAdmin.from("study_material_uploads").select("subject").eq("status", "vectorized"),
        supabaseAdmin.from("mock_test_material_uploads").select("subject").eq("status", "vectorized"),
      ]);

      const countMap = new Map<string, number>();
      for (const row of pyqRows || []) {
        if (row.subject) countMap.set(row.subject, (countMap.get(row.subject) || 0) + 1);
      }
      for (const row of [...(studySubjects || []), ...(mockSubjects || [])]) {
        if (row.subject && !countMap.has(row.subject)) countMap.set(row.subject, 0);
      }
      return countMap;
    },

    async getPlatformStats() {
      const [questionsRes, attemptsRes, usersRes] = await Promise.all([
        supabaseAdmin.from("pyq_question_bank").select("id", { count: "exact", head: true }).eq("exam", "prelims").eq("status", "approved").eq("paper", "GS-I"),
        supabaseAdmin.from("mock_test_attempts").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
      ]);
      return {
        questionsCount: questionsRes.count || 0,
        testsCount: attemptsRes.count || 0,
        usersCount: usersRes.count || 0,
      };
    },

    async createTest(data) {
      const { data: result, error } = await supabaseAdmin
        .from("mock_tests")
        .insert(data)
        .select("id, title, question_count, duration, total_marks")
        .single();
      if (error) throw new Error(`Failed to create test: ${error.message}`);
      return result;
    },

    async deleteTest(id) {
      await supabaseAdmin.from("mock_tests").delete().eq("id", id);
    },

    async insertQuestions(questions) {
      const { error } = await supabaseAdmin.from("mock_test_questions").insert(questions);
      if (error) throw new Error(`Failed to insert questions: ${error.message}`);
    },

    async findTest(testId) {
      const { data } = await supabaseAdmin
        .from("mock_tests")
        .select("id, title, duration, total_marks, exam_mode")
        .eq("id", testId)
        .single();
      return data;
    },

    async findQuestions(testId) {
      const { data } = await supabaseAdmin
        .from("mock_test_questions")
        .select("id, question_num, question_text, subject, category, difficulty, options, correct_option, explanation, marks, source_question_bank_id")
        .eq("mock_test_id", testId)
        .order("question_num", { ascending: true });
      return data || [];
    },

    async insertAttempt(data) {
      const { data: result, error } = await supabaseAdmin
        .from("mock_test_attempts")
        .insert(data)
        .select("id")
        .single();
      if (error) throw new Error(`Failed to save attempt: ${error.message}`);
      return result;
    },

    async findAttempt(userId, testId, completed) {
      let query = supabaseAdmin.from("mock_test_attempts").select("*").eq("user_id", userId).eq("mock_test_id", testId);
      if (completed) query = query.not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1);
      const { data } = await query.single();
      return data;
    },

    async upsertDraft(userId, testId, answers) {
      const draftId = `${userId}_${testId}_draft`;
      const { data: existing } = await supabaseAdmin.from("mock_test_attempts").select("id").eq("id", draftId).single();
      if (existing) {
        await supabaseAdmin.from("mock_test_attempts").update({ answers }).eq("id", draftId);
      } else {
        await supabaseAdmin.from("mock_test_attempts").insert({ id: draftId, user_id: userId, mock_test_id: testId, answers, total_marks: 0 });
      }
    },

    async insertActivity(data) {
      await supabaseAdmin.from("user_activities").insert({ id: randomUUID(), ...data });
    },

    async getStreak(userId) {
      const { data } = await supabaseAdmin.from("user_streaks").select("current_streak").eq("user_id", userId).single();
      return data?.current_streak || 0;
    },

    async countUserAttemptsToday(userId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [prelimsRes, mainsRes] = await Promise.all([
        supabaseAdmin
          .from("mock_test_attempts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("completed_at", todayIso),
        supabaseAdmin
          .from("mock_test_mains_attempts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("submitted_at", todayIso),
      ]);

      return (prelimsRes.count || 0) + (mainsRes.count || 0);
    },

    async findPYQMains(subject, paperType, limit = 40) {
      let query = supabaseAdmin
        .from("pyq_mains_questions")
        .select("id, question_text, subject, paper, year, difficulty, topic")
        .eq("status", "approved")
        .limit(limit);
      if (subject && subject !== "All Subjects") query = query.ilike("subject", `%${subject}%`);
      if (paperType) query = query.ilike("paper", `%${String(paperType).replace(/[^0-9IVX]/gi, "")}%`);
      const { data } = await query;
      return data || [];
    },

    /**
     * "Previous Year Questions" mains source — pulls directly from the
     * curated PYQ Mains bank (same table Daily Answer Writing and PYQ Mains
     * practice use), so every question carries a real marks value and a
     * `sourceQuestionBankId` that the results page can resolve back to a
     * human-authored model answer.
     */
    async findPYQBankMains(subject, paperType, limit = 40) {
      let query = supabaseAdmin
        .from("pyq_mains_question_bank")
        .select("id, question_text, subject, paper, marks, difficulty")
        .eq("status", "approved")
        .limit(limit);
      if (subject && subject !== "All Subjects") query = query.ilike("subject", `%${subject}%`);
      const paperCode = mainsPaperCode(paperType);
      if (paperCode) query = query.eq("paper", paperCode);
      const { data } = await query;
      return (data || []).map((row: any) =>
        toMockMainsQuestion({
          sourceQuestionBankId: row.id,
          questionText: row.question_text,
          subject: row.subject,
          marks: row.marks,
          difficulty: row.difficulty,
        })
      );
    },

    /**
     * "Daily Mains Challenge" mains source — pulls from the questions that
     * have actually been served as a past Daily Answer Writing question.
     * Restricted to rows with a linked `pyq_question_id` (i.e. drawn from
     * the curated bank, not the rare AI-fallback day), which guarantees a
     * curated model answer is available for every question in this pool.
     */
    async findDailyMainsHistory(subject, paperType, limit = 40) {
      let query = supabaseAdmin
        .from("daily_mains_questions")
        .select("id, question_text, subject, paper, marks, pyq_question_id")
        .not("pyq_question_id", "is", null)
        .order("date", { ascending: false })
        .limit(limit);
      if (subject && subject !== "All Subjects") query = query.ilike("subject", `%${subject}%`);
      const paperDisplay = mainsPaperDisplay(paperType);
      if (paperDisplay) query = query.eq("paper", paperDisplay);
      const { data } = await query;
      return (data || []).map((row: any) =>
        toMockMainsQuestion({
          sourceQuestionBankId: row.pyq_question_id,
          questionText: row.question_text,
          subject: row.subject,
          marks: row.marks,
        })
      );
    },

    async findPYQQuestions(subject, excludeSubjects, limit = 30) {
      let query = supabaseAdmin
        .from("pyq_questions")
        .select("*")
        .eq("status", "approved")
        .limit(limit)
        .order("year", { ascending: false });
      if (subject && subject !== "All Subjects") {
        query = query.ilike("subject", `%${subject}%`);
      } else if (excludeSubjects?.length) {
        for (const ex of excludeSubjects) query = query.not("subject", "ilike", `%${ex}%`);
      }
      const { data } = await query;
      return data || [];
    },

    async findQuestionBankQuestions({ source, userId, subject, difficulty, count, excludeAttempted = true }) {
      const requestedDifficulty = normalizeDifficulty(difficulty);
      const counts = requestedDifficulty === "Mixed"
        ? mixedDifficultyCounts(count)
        : { Easy: 0, Medium: 0, Hard: 0, [requestedDifficulty]: count } as Record<Difficulty, number>;
      const selected: any[] = [];
      const selectedIds = new Set<string>();

      let attemptedIds = new Set<string>();
      if (excludeAttempted) {
        const [{ data: mcqAttempts }, { data: mockAttempts }] = await Promise.all([
          supabaseAdmin
            .from("mcq_attempts")
            .select("daily_mcq_id")
            .eq("user_id", userId)
            .not("completed_at", "is", null),
          supabaseAdmin
            .from("mock_test_attempts")
            .select("mock_test_id")
            .eq("user_id", userId)
            .not("completed_at", "is", null),
        ]);
        const dailyIds = (mcqAttempts || []).map((row: any) => row.daily_mcq_id).filter(Boolean);
        const testIds = (mockAttempts || []).map((row: any) => row.mock_test_id).filter(Boolean);
        const [dailyQuestions, mockQuestions] = await Promise.all([
          dailyIds.length
            ? supabaseAdmin
                .from("mcq_questions")
                .select("source_question_bank_id")
                .in("daily_mcq_id", dailyIds)
                .not("source_question_bank_id", "is", null)
            : Promise.resolve({ data: [] as any[] }),
          testIds.length
            ? supabaseAdmin
                .from("mock_test_questions")
                .select("source_question_bank_id")
                .in("mock_test_id", testIds)
                .not("source_question_bank_id", "is", null)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        attemptedIds = new Set(
          [...(dailyQuestions.data || []), ...(mockQuestions.data || [])]
            .map((row: any) => row.source_question_bank_id)
            .filter(Boolean)
        );
      }

      async function fetchRows(level: Difficulty, limit: number, includeAttempted: boolean) {
        if (limit <= 0) return [];
        let query: any = supabaseAdmin
          .from("pyq_question_bank")
          .select("id, question_text, subject, difficulty, options, correct_option, explanation")
          .eq("exam", "prelims")
          .eq("status", "approved")
          .eq("paper", "GS-I")
          .ilike("difficulty", level)
          .not("correct_option", "is", null)
          .limit(Math.max(limit * 4, 20));

        if (source === "daily_mcq") {
          query = supabaseAdmin
            .from("mcq_questions")
            .select("source_question_bank_id, question_text, category, difficulty, options, correct_option, explanation")
            .ilike("difficulty", level)
            .not("source_question_bank_id", "is", null)
            .limit(Math.max(limit * 4, 20));
        }

        const shouldApplySubject =
          source === "subject_wise" ||
          source === "pyq" ||
          source === "daily_mcq";
        const patterns = shouldApplySubject ? subjectPatterns(subject) : [];
        if (patterns.length === 1 && source !== "daily_mcq") {
          query = query.ilike("subject", patterns[0]);
        }
        const { data } = await query;
        let rows = data || [];
        if (source === "daily_mcq") {
          rows = rows.map((row: any) => ({
            id: row.source_question_bank_id,
            question_text: row.question_text,
            subject: row.category,
            difficulty: row.difficulty,
            options: row.options,
            correct_option: row.correct_option,
            explanation: row.explanation,
          }));
          if (patterns.length) {
            const lowered = patterns.map((pattern) => pattern.replace(/%/g, "").toLowerCase());
            rows = rows.filter((row: any) => lowered.some((pattern) => String(row.subject || "").toLowerCase().includes(pattern)));
          }
        }
        const unseen = rows.filter((row: any) => row.id && !selectedIds.has(row.id) && (includeAttempted || !attemptedIds.has(row.id)));
        return unseen.slice(0, limit);
      }

      for (const [level, levelCount] of Object.entries(counts) as Array<[Difficulty, number]>) {
        const rows = await fetchRows(level, levelCount, false);
        selected.push(...rows);
        rows.forEach((row: any) => selectedIds.add(row.id));
      }

      if (selected.length < count) {
        for (const [level] of Object.entries(counts) as Array<[Difficulty, number]>) {
          const remaining = count - selected.length;
          if (remaining <= 0) break;
          const rows = await fetchRows(level, remaining, true);
          selected.push(...rows);
          rows.forEach((row: any) => selectedIds.add(row.id));
        }
      }

      return selected.slice(0, count).map(toMockQuestionFromBank);
    },
  };
}

export const mockTestRepo = createPrismaMockTestRepository();
