import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import type { MockTestRepository } from "./mock-test.repository";

export function createPrismaMockTestRepository(): MockTestRepository {
  return {
    async getSubjectCounts() {
      const [{ data: pyqRows }, { data: studySubjects }, { data: mockSubjects }] = await Promise.all([
        supabaseAdmin.from("pyq_questions").select("subject").eq("status", "approved"),
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
        supabaseAdmin.from("pyq_questions").select("id", { count: "exact", head: true }).eq("status", "approved"),
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
        .select("id, question_num, question_text, subject, category, difficulty, options, correct_option, explanation")
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
  };
}

export const mockTestRepo = createPrismaMockTestRepository();
