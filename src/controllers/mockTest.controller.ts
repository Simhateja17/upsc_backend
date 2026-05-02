import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { generateMCQQuestions, generateMainsQuestions } from "../services/questionGenerator";
import { generateMockTestFromRAG, hasStudyMaterial } from "../services/mockTestRag.service";

/**
 * GET /api/mock-tests/subjects
 */
export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Pull real subject counts from pyq_questions (approved only)
    const { data: pyqRows } = await supabaseAdmin
      .from("pyq_questions")
      .select("subject")
      .eq("status", "approved");

    const countMap = new Map<string, number>();
    for (const row of pyqRows || []) {
      if (row.subject) {
        countMap.set(row.subject, (countMap.get(row.subject) || 0) + 1);
      }
    }

    // Also include subjects from uploaded study/mock-test materials
    const { data: studySubjects } = await supabaseAdmin
      .from("study_material_uploads")
      .select("subject")
      .eq("status", "vectorized");

    const { data: mockSubjects } = await supabaseAdmin
      .from("mock_test_material_uploads")
      .select("subject")
      .eq("status", "vectorized");

    for (const row of [...(studySubjects || []), ...(mockSubjects || [])]) {
      if (row.subject && !countMap.has(row.subject)) {
        countMap.set(row.subject, 0);
      }
    }

    const total = Array.from(countMap.values()).reduce((a, b) => a + b, 0);

    const subjects = [
      { name: "All Subjects", count: total },
      ...Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    ];

    res.json({ status: "success", data: subjects });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/platform-stats
 * Returns real platform-wide counts for the hero section.
 */
export const getPlatformStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [questionsRes, attemptsRes, usersRes] = await Promise.all([
      supabaseAdmin.from("pyq_questions").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseAdmin.from("mock_test_attempts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    ]);

    res.json({
      status: "success",
      data: {
        questionsCount: questionsRes.count || 0,
        testsCount: attemptsRes.count || 0,
        usersCount: usersRes.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/config
 */
export const getConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      status: "success",
      data: {
        sources: [
          { id: "daily_mcq", name: "Daily MCQ", description: "From daily practice" },
          { id: "pyq", name: "Practice PYQ", description: "Previous year questions" },
          { id: "subject_wise", name: "Subject-wise", description: "Topic-focused practice" },
          { id: "mixed", name: "Mixed Bag", description: "Random mix" },
          { id: "full_length", name: "Full Length Test", description: "Complete exam simulation", isPro: true },
        ],
        examModes: [
          { id: "prelims", name: "Prelims", duration: 120 },
          { id: "mains", name: "Mains" },
        ],
        paperTypes: ["GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV"],
        difficulties: [
          { id: "easy", name: "Easy", description: "Foundation level" },
          { id: "medium", name: "Medium", description: "Exam standard" },
          { id: "hard", name: "Hard", description: "Advanced" },
          { id: "mixed", name: "Mixed", description: "All levels" },
        ],
        optionalSubjects: [
          "Anthropology", "Geography", "History", "Philosophy", "Political Science",
          "Psychology", "Public Administration", "Sociology", "Law", "Literature",
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-tests/generate
 */
export const generateTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { source, subject, examMode, paperType, questionCount, difficulty } = req.body;
    console.log(`[Mock Test] Generate: user=${userId}, subject=${subject}, count=${questionCount}, difficulty=${difficulty}`);

    const count = Math.min(questionCount || 10, 100);
    const isMainsMode = (examMode || "prelims") === "mains";
    // Prelims: 1 minute per question. Mains: ~8 minutes per question.
    const duration = isMainsMode ? Math.max(10, count * 8) : count;
    // Mains: 15 marks per question by UPSC convention. Prelims: 2 marks.
    const totalMarks = isMainsMode ? count * 15 : count * 2;

    const { data: mockTest, error: createErr } = await supabaseAdmin
      .from("mock_tests")
      .insert({
        id: randomUUID(),
        title: `${subject || "Mixed"} - ${examMode || "Prelims"} Practice`,
        source: source || "mixed",
        exam_mode: examMode || "prelims",
        paper_type: paperType,
        subject: subject === "All Subjects" ? null : subject,
        difficulty: difficulty || "mixed",
        question_count: count,
        duration,
        total_marks: totalMarks,
        is_generated: true,
      })
      .select("id, title, question_count, duration, total_marks")
      .single();

    if (createErr || !mockTest) {
      console.error("Failed to create mock test:", createErr);
      return res.status(500).json({ status: "error", message: "Failed to create test" });
    }

    const targetSubject = subject && subject !== "All Subjects" ? subject : "General Studies";

    let finalQuestions: any[] = [];

    // ── MAINS PATH: pull from admin-seeded PYQ Mains bank (approved only) ──
    if (isMainsMode) {
      let mainsQuery = supabaseAdmin
        .from("pyq_mains_questions")
        .select("id, question_text, subject, paper, year, difficulty, topic")
        .eq("status", "approved")
        .limit(Math.max(count * 4, 40));

      if (subject && subject !== "All Subjects") {
        mainsQuery = mainsQuery.ilike("subject", `%${subject}%`);
      }
      if (paperType) {
        // paperType from UI like "gs1" / "GS Paper I" — match either
        mainsQuery = mainsQuery.ilike("paper", `%${String(paperType).replace(/[^0-9IVX]/gi, "")}%`);
      }

      const { data: mainsRows, error: mainsErr } = await mainsQuery;
      if (mainsErr) {
        console.error("[MockTest] mains query failed:", mainsErr);
      }

      // Random sample `count` from the pool so repeated clicks give variety.
      const pool = (mainsRows || []).slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picked = pool.slice(0, count);

      finalQuestions = picked.map((q: any) => ({
        questionText: q.question_text,
        options: [], // mains: no options
        correctOption: null,
        subject: q.subject,
        category: q.subject,
        difficulty: q.difficulty || difficulty || "Medium",
        explanation: "",
      }));

      console.log(
        `[MockTest] mains: ${finalQuestions.length} admin PYQ mains pulled (need ${count})`
      );

      // Top up with AI-generated mains questions — subject + difficulty aware,
      // open-ended style (no options, no model answers). Evaluator grades strictly after submission.
      if (finalQuestions.length < count) {
        const remaining = count - finalQuestions.length;
        try {
          const aiMains = await generateMainsQuestions({
            subject: targetSubject,
            difficulty: difficulty || "medium",
            count: remaining,
            paperType,
            marksPerQuestion: 15,
          });
          console.log(`[MockTest] mains: AI generated ${aiMains.length}/${remaining}`);
          finalQuestions = [
            ...finalQuestions,
            ...aiMains.map((q) => ({
              questionText: q.questionText,
              options: [],
              correctOption: null,
              subject: q.subject || targetSubject,
              category: q.category || targetSubject,
              difficulty: q.difficulty || difficulty || "medium",
              explanation: "",
            })),
          ];
        } catch (aiErr) {
          console.error("[MockTest] mains AI generation failed:", aiErr);
        }
      }

      if (finalQuestions.length === 0) {
        await supabaseAdmin.from("mock_tests").delete().eq("id", mockTest.id);
        return res.status(500).json({
          status: "error",
          message:
            "Unable to generate mains questions right now. Please retry in a moment.",
        });
      }
    } else {
      // ── PRELIMS PATH ──
      // RAG first if we have uploaded study material, then PYQ bank, then AI fill.
      const ragAvailable = await hasStudyMaterial(targetSubject);

      if (ragAvailable) {
        try {
          console.log(`[MockTest] RAG generation for subject="${targetSubject}" count=${count}`);
          const ragQuestions = await generateMockTestFromRAG({
            subject: targetSubject,
            topic: req.body.topic,
            difficulty: difficulty || "mixed",
            questionCount: count,
            examMode: examMode || "prelims",
          });
          finalQuestions = ragQuestions;
          console.log(`[MockTest] RAG produced ${ragQuestions.length} questions`);
        } catch (ragErr) {
          console.warn("[MockTest] RAG failed, falling back to standard generation:", ragErr);
        }
      }

      let pyqQuestions: any[] = [];
      let aiQuestions: any[] = [];
      let pyqCount = 0;
      let aiCount = 0;
      if (finalQuestions.length < count) {
        const remaining = count - finalQuestions.length;

        if (source === "pyq" || source === "mixed" || finalQuestions.length === 0) {
          // UPSC-priority subject list — kept in rank order so "All Subjects"
          // pulls a balanced mix instead of whatever was most recently seeded
          // (which can otherwise skew toward sports/GK fillers).
          const PRIORITY_SUBJECTS = [
            "Polity", "Economy", "Geography", "Environment",
            "History", "Science", "Current Affairs", "International",
            "Ethics", "Society", "Agriculture",
          ];
          const EXCLUDE_SUBJECTS = ["Sports", "Entertainment", "Lifestyle"];

          let pyqQuery = supabaseAdmin
            .from("pyq_questions")
            .select("*")
            .eq("status", "approved")
            .limit(Math.max(remaining * 3, 30))
            .order("year", { ascending: false });

          if (subject && subject !== "All Subjects") {
            pyqQuery = pyqQuery.ilike("subject", `%${subject}%`);
          } else {
            // Drop known non-UPSC categories at the query level.
            for (const ex of EXCLUDE_SUBJECTS) {
              pyqQuery = pyqQuery.not("subject", "ilike", `%${ex}%`);
            }
          }

          const { data } = await pyqQuery;
          const pool = data || [];

          // When no subject was specified, round-robin across priority
          // subjects so results are balanced, not dominated by whichever
          // category has the most rows.
          if (!subject || subject === "All Subjects") {
            const buckets: Record<string, any[]> = {};
            for (const q of pool) {
              const subj = (q.subject || "Other") as string;
              const key = PRIORITY_SUBJECTS.find((p) => subj.toLowerCase().includes(p.toLowerCase())) || "Other";
              (buckets[key] = buckets[key] || []).push(q);
            }
            const ordered: any[] = [];
            const keys = [...PRIORITY_SUBJECTS, "Other"];
            let added = true;
            while (ordered.length < Math.ceil(remaining / 2) && added) {
              added = false;
              for (const key of keys) {
                if (buckets[key] && buckets[key].length > 0) {
                  ordered.push(buckets[key].shift());
                  added = true;
                  if (ordered.length >= Math.ceil(remaining / 2)) break;
                }
              }
            }
            pyqQuestions = ordered;
          } else {
            pyqQuestions = pool.slice(0, Math.ceil(remaining / 2));
          }
        }

        pyqCount = pyqQuestions.length;
        aiCount = remaining - pyqQuestions.length;
        if (aiCount > 0) {
          aiQuestions = await generateMCQQuestions({
            subject: targetSubject,
            difficulty: difficulty || "medium",
            count: aiCount,
            examMode: examMode || "prelims",
          });
        }
        aiCount = aiQuestions.length;

        finalQuestions = [
          ...finalQuestions,
          ...pyqQuestions.map((q: any) => ({
            questionText: q.question_text,
            options: q.options,
            correctOption: q.correct_option || "A",
            subject: q.subject,
            category: q.subject,
            difficulty: q.difficulty,
            explanation: q.explanation || "",
          })),
          ...aiQuestions,
        ];
      }

      console.log(`[MockTest] prelims: ${pyqCount} PYQ + ${aiCount} AI`);
    }

    // ── Save questions ───────────────────────────────────────────────
    let questionNum = 1;
    const questionsToInsert = finalQuestions.slice(0, count).map((q: any) => ({
      id: randomUUID(),
      mock_test_id: mockTest.id,
      question_num: questionNum++,
      question_text: q.questionText,
      subject: q.subject || targetSubject,
      category: q.category || q.subject || targetSubject,
      difficulty: q.difficulty || difficulty || "Medium",
      options: isMainsMode
        ? []
        : (q.options || [
            { id: "A", text: "Option A" },
            { id: "B", text: "Option B" },
            { id: "C", text: "Option C" },
            { id: "D", text: "Option D" },
          ]),
      // Mains questions are open-ended (no correct option). Column is NOT NULL in schema,
      // so we store a sentinel — getTestQuestions strips this field for mains clients.
      correct_option: isMainsMode ? "N/A" : (q.correctOption || "A"),
      explanation: q.explanation || "",
    }));

    if (questionsToInsert.length === 0) {
      await supabaseAdmin.from("mock_tests").delete().eq("id", mockTest.id);
      return res.status(500).json({
        status: "error",
        message: "No questions could be generated for your selection. Please retry or change filters.",
      });
    }

    const { error: qInsertErr } = await supabaseAdmin
      .from("mock_test_questions")
      .insert(questionsToInsert);
    if (qInsertErr) {
      console.error("[Mock Test] Failed to insert questions:", qInsertErr.message);
      await supabaseAdmin.from("mock_tests").delete().eq("id", mockTest.id);
      return res.status(500).json({
        status: "error",
        message: `Failed to save generated questions: ${qInsertErr.message}`,
      });
    }

    await supabaseAdmin.from("user_activities").insert({
      id: randomUUID(),
      user_id: userId,
      type: "mock_test",
      title: "Generated Mock Test",
      description: `${count} questions on ${subject || "Mixed"}`,
    });

    console.log(`[Mock Test] Generated: ${mockTest.id} with ${questionNum - 1} questions (mode=${examMode})`);
    res.json({
      status: "success",
      data: {
        testId: mockTest.id,
        title: mockTest.title,
        questionCount: mockTest.question_count,
        duration: mockTest.duration,
        totalMarks: mockTest.total_marks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/:testId/questions
 */
export const getTestQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params.testId as string;

    const { data: test } = await supabaseAdmin
      .from("mock_tests")
      .select("id, title, duration, total_marks, exam_mode")
      .eq("id", testId)
      .single();

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    const isMains = (test.exam_mode || "").toLowerCase() === "mains";

    const { data: questions } = await supabaseAdmin
      .from("mock_test_questions")
      .select("id, question_num, question_text, subject, category, difficulty, options, correct_option, explanation")
      .eq("mock_test_id", testId)
      .order("question_num", { ascending: true });

    res.json({
      status: "success",
      data: {
        testId: test.id,
        title: test.title,
        duration: test.duration,
        totalMarks: test.total_marks,
        examMode: test.exam_mode,
        questions: (questions || []).map((q: any) => ({
          id: q.id,
          questionNum: q.question_num,
          text: q.question_text,
          subject: q.subject,
          category: q.category,
          difficulty: q.difficulty,
          // For mains, never expose correct answer or explanation to the client — answers are AI-evaluated after submission.
          ...(isMains ? {} : { correct: q.correct_option, explanation: q.explanation || "" }),
          options: (q.options || []).map((o: any) => ({
            label: o.id || o.label,
            text: o.text,
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-tests/:testId/submit
 */
export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers, timeTaken } = req.body;
    console.log(`[Mock Test] Submit: user=${userId}, testId=${testId}, timeTaken=${timeTaken}`);

    const { data: test } = await supabaseAdmin
      .from("mock_tests")
      .select("id, question_count, total_marks")
      .eq("id", testId)
      .single();

    if (!test) {
      return res.status(404).json({ status: "error", message: "Test not found" });
    }

    const { data: questions } = await supabaseAdmin
      .from("mock_test_questions")
      .select("id, subject, correct_option")
      .eq("mock_test_id", testId);

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const subjectWise: Record<string, { correct: number; wrong: number; total: number }> = {};

    for (const q of (questions || [])) {
      const selected = answers?.[q.id] || null;
      if (!subjectWise[q.subject]) subjectWise[q.subject] = { correct: 0, wrong: 0, total: 0 };
      subjectWise[q.subject].total++;

      if (!selected) {
        skippedCount++;
      } else if (selected === q.correct_option) {
        correctCount++;
        subjectWise[q.subject].correct++;
      } else {
        wrongCount++;
        subjectWise[q.subject].wrong++;
      }
    }

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
    const score = correctCount * 2 - wrongCount * 0.66;

    const analysis = generateAnalysis(correctCount, wrongCount, skippedCount, test.question_count, subjectWise);

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from("mock_test_attempts")
      .insert({
        id: randomUUID(),
        user_id: userId,
        mock_test_id: testId,
        answers: answers || {},
        score: Math.max(0, Math.round(score * 10) / 10),
        total_marks: test.total_marks,
        correct_count: correctCount,
        wrong_count: wrongCount,
        skipped_count: skippedCount,
        accuracy: Math.round(accuracy * 10) / 10,
        time_taken: timeTaken || 0,
        subject_wise: subjectWise,
        analysis,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attemptErr) {
      console.error("Failed to save attempt:", attemptErr);
      return res.status(500).json({ status: "error", message: "Failed to save attempt" });
    }

    await supabaseAdmin.from("user_activities").insert({
      id: randomUUID(),
      user_id: userId,
      type: "mock_test",
      title: "Completed Mock Test",
      description: `Score: ${Math.round(score)}/${test.total_marks}`,
    });

    console.log(`[Mock Test] User ${userId} scored ${Math.round(score)}/${test.total_marks} (${Math.round(accuracy)}%)`);
    res.json({
      status: "success",
      data: { attemptId: attempt!.id, testId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/mock-tests/:testId/save-progress
 */
export const saveProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers } = req.body;
    const draftId = `${userId}_${testId}_draft`;

    const { data: existing } = await supabaseAdmin
      .from("mock_test_attempts")
      .select("id")
      .eq("id", draftId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("mock_test_attempts")
        .update({ answers: answers || {} })
        .eq("id", draftId);
    } else {
      await supabaseAdmin.from("mock_test_attempts").insert({
        id: draftId,
        user_id: userId,
        mock_test_id: testId,
        answers: answers || {},
        total_marks: 0,
      });
    }

    res.json({ status: "success", message: "Progress saved" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/:testId/results
 */
export const getTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const { data: attempt } = await supabaseAdmin
      .from("mock_test_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("mock_test_id", testId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!attempt) {
      return res.status(404).json({ status: "error", message: "No completed attempt found" });
    }

    const { data: questions } = await supabaseAdmin
      .from("mock_test_questions")
      .select("*")
      .eq("mock_test_id", testId)
      .order("question_num", { ascending: true });

    const answers = (attempt.answers || {}) as Record<string, string>;
    const questionReview = (questions || []).map((q: any) => ({
      id: q.id,
      questionNum: q.question_num,
      questionText: q.question_text,
      subject: q.subject,
      options: q.options,
      correctOption: q.correct_option,
      selectedOption: answers[q.id] || null,
      isCorrect: answers[q.id] === q.correct_option,
      explanation: q.explanation,
    }));

    res.json({
      status: "success",
      data: {
        ...attempt,
        questions: questionReview,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mock-tests/:testId/recommendations
 */
export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;

    const { data: attempt } = await supabaseAdmin
      .from("mock_test_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("mock_test_id", testId)
      .not("completed_at", "is", null)
      .limit(1)
      .single();

    const { data: streak } = await supabaseAdmin
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .single();

    const recommendations = [];

    if (attempt) {
      const subjectWise = (attempt.subject_wise || {}) as Record<string, { correct: number; wrong: number; total: number }>;
      const weakSubjects = Object.entries(subjectWise)
        .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5)
        .map(([k]) => k);

      if (weakSubjects.length > 0) {
        recommendations.push({
          type: "study",
          title: "Review Weak Subjects",
          description: `Focus on: ${weakSubjects.join(", ")}`,
          action: "Study Material",
          link: "/dashboard/library",
        });
      }

      if (attempt.accuracy < 50) {
        recommendations.push({
          type: "practice",
          title: "More Practice Needed",
          description: "Try easier difficulty to build confidence",
          action: "Generate Easy Test",
          link: "/dashboard/mock-tests",
        });
      }
    }

    recommendations.push(
      { type: "mcq", title: "Daily MCQ Challenge", description: "Keep your streak going", action: "Start MCQ", link: "/dashboard/daily-mcq" },
      { type: "answer", title: "Practice Answer Writing", description: "Improve your mains score", action: "Write Answer", link: "/dashboard/daily-answer" },
    );

    res.json({
      status: "success",
      data: { recommendations, streak: { currentStreak: streak?.current_streak || 0 } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/practice-stats
 */
export const getPracticeStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from("mock_test_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", today.toISOString());

    const { data: streak } = await supabaseAdmin
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .single();

    res.json({
      status: "success",
      data: { todayCount: count || 0, streak: streak?.current_streak || 0 },
    });
  } catch (error) {
    next(error);
  }
};

function generateAnalysis(correct: number, wrong: number, skipped: number, total: number, subjectWise: Record<string, any>): string {
  const accuracy = (correct + wrong) > 0 ? (correct / (correct + wrong)) * 100 : 0;
  let analysis = `You answered ${correct} out of ${total} questions correctly (${Math.round(accuracy)}% accuracy). `;
  if (wrong > 0) analysis += `${wrong} incorrect answers resulted in negative marking. `;
  if (skipped > 0) analysis += `${skipped} questions were left unattempted. `;

  const weakSubjects = Object.entries(subjectWise)
    .filter(([, v]: [string, any]) => v.total > 0 && v.correct / v.total < 0.5)
    .map(([k]) => k);

  if (weakSubjects.length > 0) {
    analysis += `Areas needing improvement: ${weakSubjects.join(", ")}. `;
  }
  analysis += "Keep practicing regularly to improve your scores.";
  return analysis;
}
