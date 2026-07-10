import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { mockTestRepo } from "../repositories/prisma-mock-test.repository";
import { generateMainsQuestions } from "../services/questionGenerator";

export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countMap = await mockTestRepo.getSubjectCounts();
    const total = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
    const subjects = [
      { name: "All Subjects", count: total },
      ...Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    ];
    res.json({ status: "success", data: subjects });
  } catch (error) { next(error); }
};

export const getPlatformStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await mockTestRepo.getPlatformStats();
    res.json({ status: "success", data: stats });
  } catch (error) { next(error); }
};

export const getConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: "success", data: {
      sources: [
        { id: "daily_mcq", label: "Daily MCQ", name: "Daily MCQ", description: "From daily practice" },
        { id: "pyq", label: "Practice PYQ", name: "Practice PYQ", description: "Previous year questions" },
        { id: "subject_wise", label: "Subject-wise", name: "Subject-wise", description: "Topic-focused practice" },
        { id: "mixed", label: "Mixed Bag", name: "Mixed Bag", description: "Random mix" },
        { id: "full_length", label: "Full Length Test", name: "Full Length Test", description: "Complete GS Paper I simulation", isPro: true },
      ],
      examModes: [{ id: "prelims", name: "Prelims", duration: 120 }, { id: "mains", name: "Mains" }],
      paperTypes: ["GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV"],
      difficulties: [
        { id: "easy", name: "Easy" }, { id: "medium", name: "Medium" }, { id: "hard", name: "Hard" }, { id: "mixed", name: "Mixed" },
      ],
      optionalSubjects: ["Anthropology","Geography","History","Philosophy","Political Science","Psychology","Public Administration","Sociology","Law","Literature"],
    }});
  } catch (error) { next(error); }
};

function normalizeSource(source: string | undefined): string {
  const normalized = String(source || "mixed").trim().toLowerCase().replace(/-/g, "_");
  const aliases: Record<string, string> = {
    practice_pyq: "pyq",
    subjectwise: "subject_wise",
    mixed_bag: "mixed",
    full_length_test: "full_length",
  };
  return aliases[normalized] || normalized;
}

function normalizePaperType(value: unknown): string {
  const raw = String(value || "gs1").trim().toLowerCase();
  if (raw.includes("csat") || raw.includes("paper ii") || raw === "gs2") return "csat";
  return "gs1";
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

type MainsPoolQuestion = {
  sourceQuestionBankId: string | null;
  questionText: string;
  subject: string;
  category: string;
  difficulty: string;
  explanation: string;
  marks: number;
};

// A real UPSC GS Mains paper is 20 questions: 10 worth 10 marks (~150 words)
// and 10 worth 15 marks (~250 words), 250 marks total.
const MAINS_FULL_LENGTH_PATTERN: number[] = [...Array(10).fill(10), ...Array(10).fill(15)];
const MAINS_FULL_LENGTH_COUNT = MAINS_FULL_LENGTH_PATTERN.length;
const MAINS_FULL_LENGTH_TOTAL_MARKS = MAINS_FULL_LENGTH_PATTERN.reduce((a, b) => a + b, 0);

function dedupeBySourceId(rows: MainsPoolQuestion[]): MainsPoolQuestion[] {
  const seen = new Set<string>();
  const out: MainsPoolQuestion[] = [];
  for (const row of rows) {
    const key = row.sourceQuestionBankId || `text:${row.questionText.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function aiMainsQuestions(params: {
  subject: string;
  difficulty: string;
  count: number;
  paperType?: string;
  marksPerQuestion?: number;
}): Promise<MainsPoolQuestion[]> {
  if (params.count <= 0) return [];
  try {
    const generated = await generateMainsQuestions(params);
    return generated.map((q: any) => ({
      sourceQuestionBankId: null,
      questionText: q.questionText,
      subject: q.subject || params.subject,
      category: q.category || q.subject || params.subject,
      difficulty: q.difficulty || params.difficulty,
      explanation: "",
      marks: params.marksPerQuestion || 15,
    }));
  } catch {
    return [];
  }
}

/**
 * "Daily Mains Challenge" / "Previous Year Questions" pools: draw from a
 * curated source, dedupe, and pad any shortfall with AI-generated questions
 * at the standard 15-mark pattern so the requested count is always met.
 */
async function curatedMainsPool(params: {
  fetch: () => Promise<MainsPoolQuestion[]>;
  count: number;
  difficulty: string;
  paperType?: string;
  targetSubject: string;
}): Promise<MainsPoolQuestion[]> {
  const rows = await params.fetch();
  let pool = dedupeBySourceId(shuffle([...rows])).slice(0, params.count);
  if (pool.length < params.count) {
    pool = pool.concat(
      await aiMainsQuestions({
        subject: params.targetSubject,
        difficulty: params.difficulty,
        count: params.count - pool.length,
        paperType: params.paperType,
        marksPerQuestion: 15,
      })
    );
  }
  return pool;
}

async function fullLengthMainsPool(params: {
  subject?: string;
  paperType?: string;
  difficulty: string;
  targetSubject: string;
}): Promise<MainsPoolQuestion[]> {
  const poolLimit = 120;
  const [dailyRows, bankRows] = await Promise.all([
    mockTestRepo.findDailyMainsHistory(params.subject, params.paperType, poolLimit),
    mockTestRepo.findPYQBankMains(params.subject, params.paperType, poolLimit),
  ]);
  const curated = shuffle(dedupeBySourceId([...dailyRows, ...bankRows]));

  const used = new Set<MainsPoolQuestion>();
  const takeOne = (target: number): MainsPoolQuestion | null => {
    const match = curated.find((q) => q.marks === target && !used.has(q));
    if (match) used.add(match);
    return match || null;
  };

  const slots: Array<MainsPoolQuestion | null> = MAINS_FULL_LENGTH_PATTERN.map(takeOne);

  // Fill any slots the curated pools couldn't cover with AI-generated
  // questions pinned to the exact target marks, so the paper still lands on
  // the real 10/15-mark pattern.
  const missingByMarks = new Map<number, number[]>();
  slots.forEach((slot, i) => {
    if (slot) return;
    const target = MAINS_FULL_LENGTH_PATTERN[i];
    missingByMarks.set(target, [...(missingByMarks.get(target) || []), i]);
  });
  for (const [target, indexes] of missingByMarks) {
    const generated = await aiMainsQuestions({
      subject: params.targetSubject,
      difficulty: params.difficulty,
      count: indexes.length,
      paperType: params.paperType,
      marksPerQuestion: target,
    });
    indexes.forEach((idx, n) => { slots[idx] = generated[n] || null; });
  }

  return slots.filter((s): s is MainsPoolQuestion => Boolean(s));
}

/**
 * Routes a Mains mock test's question pool by the user-selected source.
 * "mixed" (and any unrecognized source) draws an even split across the
 * curated Daily Mains history, curated PYQ bank, and AI generation.
 */
async function buildMainsPool(params: {
  source: string;
  subject?: string;
  paperType?: string;
  difficulty: string;
  count: number;
  targetSubject: string;
}): Promise<MainsPoolQuestion[]> {
  const { source, subject, paperType, difficulty, count, targetSubject } = params;
  const poolLimit = Math.max(count * 4, 40);

  if (source === "daily_mains") {
    return curatedMainsPool({
      fetch: () => mockTestRepo.findDailyMainsHistory(subject, paperType, poolLimit),
      count, difficulty, paperType, targetSubject,
    });
  }

  if (source === "pyq") {
    return curatedMainsPool({
      fetch: () => mockTestRepo.findPYQBankMains(subject, paperType, poolLimit),
      count, difficulty, paperType, targetSubject,
    });
  }

  if (source === "question_bank") {
    // "Question Bank" for Mains means fresh AI-generated questions on demand.
    return aiMainsQuestions({ subject: targetSubject, difficulty, count, paperType, marksPerQuestion: 15 });
  }

  if (source === "full_length") {
    return fullLengthMainsPool({ subject, paperType, difficulty, targetSubject });
  }

  // "mixed" — even split across the three pools.
  const perPool = Math.ceil(count / 3);
  const [dailyRows, bankRows] = await Promise.all([
    mockTestRepo.findDailyMainsHistory(subject, paperType, Math.max(perPool * 4, 20)),
    mockTestRepo.findPYQBankMains(subject, paperType, Math.max(perPool * 4, 20)),
  ]);
  const curated = dedupeBySourceId(shuffle([...dailyRows, ...bankRows]));
  const fromCurated = curated.slice(0, Math.min(count, perPool * 2));
  const aiNeeded = Math.max(0, Math.min(perPool, count - fromCurated.length));
  const fromAi = await aiMainsQuestions({ subject: targetSubject, difficulty, count: aiNeeded, paperType, marksPerQuestion: 15 });
  let pool = shuffle([...fromCurated, ...fromAi]).slice(0, count);
  if (pool.length < count) {
    pool = pool.concat(
      await aiMainsQuestions({ subject: targetSubject, difficulty, count: count - pool.length, paperType, marksPerQuestion: 15 })
    );
  }
  return pool;
}

export const generateTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { subject, examMode, paperType, questionCount, difficulty } = req.body;
    const source = normalizeSource(req.body.source);
    const isMainsMode = (examMode || "prelims") === "mains";
    const isFullLength = source === "full_length";
    const count = isFullLength
      ? (isMainsMode ? MAINS_FULL_LENGTH_COUNT : 100)
      : Math.min(questionCount || 10, 100);
    const duration = isMainsMode
      ? (isFullLength ? 180 : Math.max(10, count * 8))
      : count;
    const total_marks = isMainsMode
      ? (isFullLength ? MAINS_FULL_LENGTH_TOTAL_MARKS : count * 15)
      : count * 2;
    const selectedSubject = subject === "All Subjects" ? null : subject;
    const selectedDifficulty = isFullLength ? "mixed" : (difficulty || "mixed");

    if (!isMainsMode) {
      const normalizedPaper = normalizePaperType(paperType);
      if (normalizedPaper === "csat") {
        return res.status(400).json({
          status: "error",
          message: "CSAT question bank is coming soon. Currently available: GS Paper I.",
        });
      }
      if (source === "subject_wise" && !selectedSubject) {
        return res.status(400).json({
          status: "error",
          message: "Please select a focus subject for Subject-wise mock test.",
        });
      }
    }

    const mockTest = await mockTestRepo.createTest({
      id: randomUUID(),
      title: `${subject || "Mixed"} - ${examMode || "Prelims"} Practice`,
      source, exam_mode: examMode || "prelims",
      paper_type: isMainsMode ? paperType : "GS Paper I", subject: selectedSubject,
      difficulty: selectedDifficulty, question_count: count, duration, total_marks, is_generated: true,
    });

    const targetSubject = subject && subject !== "All Subjects" ? subject : "General Studies";
    let finalQuestions: any[] = [];

    if (isMainsMode) {
      finalQuestions = await buildMainsPool({
        source, subject, paperType, difficulty: difficulty || "medium", count, targetSubject,
      });
    } else {
      finalQuestions = await mockTestRepo.findQuestionBankQuestions({
        source,
        userId,
        subject: selectedSubject || undefined,
        difficulty: selectedDifficulty,
        count,
      });
    }

    if (finalQuestions.length < count) {
      await mockTestRepo.deleteTest(mockTest.id);
      return res.status(400).json({
        status: "error",
        message: `Not enough questions available for these filters. Found ${finalQuestions.length}, need ${count}.`,
      });
    }

    let questionNum = 1;
    const questionsToInsert = finalQuestions.slice(0, count).map((q: any) => ({
      id: randomUUID(), mock_test_id: mockTest.id, question_num: questionNum++,
      source_question_bank_id: q.sourceQuestionBankId || null,
      question_text: q.questionText, subject: q.subject || targetSubject,
      category: q.category || q.subject || targetSubject, difficulty: q.difficulty || difficulty || "Medium",
      options: isMainsMode ? [] : (q.options || [{ id: "A", text: "A" }, { id: "B", text: "B" }, { id: "C", text: "C" }, { id: "D", text: "D" }]),
      correct_option: isMainsMode ? "N/A" : (q.correctOption || "A"), explanation: q.explanation || "",
      marks: isMainsMode ? (q.marks || 15) : null,
    }));

    await mockTestRepo.insertQuestions(questionsToInsert);
    await mockTestRepo.insertActivity({ user_id: userId, type: "mock_test", title: "Generated Mock Test", description: `${count} questions on ${subject || "Mixed"}` });

    res.json({ status: "success", data: { testId: mockTest.id, title: mockTest.title, questionCount: mockTest.question_count, duration: mockTest.duration, totalMarks: mockTest.total_marks } });
  } catch (error) { next(error); }
};

export const getTestQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const test = await mockTestRepo.findTest(req.params.testId as string);
    if (!test) return res.status(404).json({ status: "error", message: "Test not found" });
    const questions = await mockTestRepo.findQuestions(req.params.testId as string);
    res.json({ status: "success", data: {
      testId: test.id, title: test.title, duration: test.duration, totalMarks: test.total_marks, examMode: test.exam_mode,
      questions: questions.map((q: any) => ({
        id: q.id, questionNum: q.question_num, text: q.question_text,
        subject: q.subject, category: q.category, difficulty: q.difficulty,
        marks: q.marks || null,
        options: (q.options || []).map((o: any) => ({ label: o.id || o.label, text: o.text })),
      })),
    }});
  } catch (error) { next(error); }
};

export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const { answers, timeTaken } = req.body;

    const test = await mockTestRepo.findTest(testId);
    if (!test) return res.status(404).json({ status: "error", message: "Test not found" });

    const questions = await mockTestRepo.findQuestions(testId);
    let correctCount = 0, wrongCount = 0, skippedCount = 0;
    const subjectWise: Record<string, { correct: number; wrong: number; total: number }> = {};

    for (const q of questions) {
      const selected = answers?.[q.id] || null;
      if (!subjectWise[q.subject]) subjectWise[q.subject] = { correct: 0, wrong: 0, total: 0 };
      subjectWise[q.subject].total++;
      if (!selected) skippedCount++;
      else if (selected === q.correct_option) { correctCount++; subjectWise[q.subject].correct++; }
      else { wrongCount++; subjectWise[q.subject].wrong++; }
    }

    const accuracy = correctCount + wrongCount > 0 ? (correctCount / (correctCount + wrongCount)) * 100 : 0;
    const score = correctCount * 2 - wrongCount * 0.66;
    const analysis = generateAnalysis(correctCount, wrongCount, skippedCount, test.question_count, subjectWise);

    const attempt = await mockTestRepo.insertAttempt({
      id: randomUUID(), user_id: userId, mock_test_id: testId, answers: answers || {},
      score: Math.max(0, Math.round(score * 10) / 10), total_marks: test.total_marks,
      correct_count: correctCount, wrong_count: wrongCount, skipped_count: skippedCount,
      accuracy: Math.round(accuracy * 10) / 10, time_taken: timeTaken || 0,
      subject_wise: subjectWise, analysis, completed_at: new Date().toISOString(),
    });

    await mockTestRepo.insertActivity({ user_id: userId, type: "mock_test", title: "Completed Mock Test", description: `Score: ${Math.round(score)}/${test.total_marks}` });
    res.json({ status: "success", data: { attemptId: attempt!.id, testId } });
  } catch (error) { next(error); }
};

export const saveProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mockTestRepo.upsertDraft(req.user!.id, req.params.testId as string, req.body.answers || {});
    res.json({ status: "success", message: "Progress saved" });
  } catch (error) { next(error); }
};

export const getTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const attempt = await mockTestRepo.findAttempt(userId, testId, true);
    if (!attempt) return res.status(404).json({ status: "error", message: "No completed attempt found" });

    const questions = await mockTestRepo.findQuestions(testId);
    const answers = (attempt.answers || {}) as Record<string, string>;
    const questionReview = questions.map((q: any) => ({
      id: q.id, questionNum: q.question_num, questionText: q.question_text, subject: q.subject,
      options: q.options, correctOption: q.correct_option,
      selectedOption: answers[q.id] || null, isCorrect: answers[q.id] === q.correct_option, explanation: q.explanation,
    }));

    res.json({ status: "success", data: { ...attempt, questions: questionReview } });
  } catch (error) { next(error); }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId as string;
    const attempt = await mockTestRepo.findAttempt(userId, testId, true);
    const currentStreak = await mockTestRepo.getStreak(userId);
    const recommendations: any[] = [];

    if (attempt) {
      const subjectWise = (attempt.subject_wise || {}) as Record<string, { correct: number; wrong: number; total: number }>;
      const weak = Object.entries(subjectWise).filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k);
      if (weak.length) recommendations.push({ type: "study", title: "Review Weak Subjects", description: `Focus on: ${weak.join(", ")}`, action: "Study Material", link: "/dashboard/library" });
      if (attempt.accuracy < 50) recommendations.push({ type: "practice", title: "More Practice Needed", description: "Try easier difficulty", action: "Generate Easy Test", link: "/dashboard/mock-tests" });
    }
    recommendations.push(
      { type: "mcq", title: "Daily MCQ Challenge", description: "Keep your streak going", action: "Start MCQ", link: "/dashboard/daily-mcq" },
      { type: "answer", title: "Practice Answer Writing", description: "Improve your mains score", action: "Write Answer", link: "/dashboard/daily-answer" },
    );

    res.json({ status: "success", data: { recommendations, streak: { currentStreak } } });
  } catch (error) { next(error); }
};

export const getPracticeStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [todayCount, streak] = await Promise.all([
      mockTestRepo.countUserAttemptsToday(userId),
      mockTestRepo.getStreak(userId),
    ]);
    res.json({ status: "success", data: { todayCount, streak } });
  } catch (error) { next(error); }
};

function generateAnalysis(correct: number, wrong: number, skipped: number, total: number, subjectWise: Record<string, any>): string {
  const accuracy = (correct + wrong) > 0 ? (correct / (correct + wrong)) * 100 : 0;
  let analysis = `You answered ${correct} out of ${total} questions correctly (${Math.round(accuracy)}% accuracy). `;
  if (wrong > 0) analysis += `${wrong} incorrect answers resulted in negative marking. `;
  if (skipped > 0) analysis += `${skipped} questions were left unattempted. `;
  const weakSubjects = Object.entries(subjectWise).filter(([, v]: [string, any]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k);
  if (weakSubjects.length > 0) analysis += `Areas needing improvement: ${weakSubjects.join(", ")}. `;
  return analysis + "Keep practicing regularly to improve your scores.";
}
