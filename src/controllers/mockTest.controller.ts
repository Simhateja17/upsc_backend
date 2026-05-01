import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { mockTestRepo } from "../repositories/prisma-mock-test.repository";
import { generateMCQQuestions, generateMainsQuestions } from "../services/questionGenerator";
import { generateMockTestFromRAG, hasStudyMaterial } from "../services/mockTestRag.service";

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
        { id: "daily_mcq", name: "Daily MCQ", description: "From daily practice" },
        { id: "pyq", name: "Practice PYQ", description: "Previous year questions" },
        { id: "subject_wise", name: "Subject-wise", description: "Topic-focused practice" },
        { id: "mixed", name: "Mixed Bag", description: "Random mix" },
        { id: "full_length", name: "Full Length Test", description: "Complete exam simulation", isPro: true },
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

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

export const generateTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { source, subject, examMode, paperType, questionCount, difficulty } = req.body;
    const count = Math.min(questionCount || 10, 100);
    const isMainsMode = (examMode || "prelims") === "mains";
    const duration = isMainsMode ? Math.max(10, count * 8) : count;
    const total_marks = isMainsMode ? count * 15 : count * 2;

    const mockTest = await mockTestRepo.createTest({
      id: randomUUID(),
      title: `${subject || "Mixed"} - ${examMode || "Prelims"} Practice`,
      source: source || "mixed", exam_mode: examMode || "prelims",
      paper_type: paperType, subject: subject === "All Subjects" ? null : subject,
      difficulty: difficulty || "mixed", question_count: count, duration, total_marks, is_generated: true,
    });

    const targetSubject = subject && subject !== "All Subjects" ? subject : "General Studies";
    let finalQuestions: any[] = [];

    if (isMainsMode) {
      const mainsRows = await mockTestRepo.findPYQMains(subject, paperType, Math.max(count * 4, 40));
      const pool = shuffle([...(mainsRows || [])]).slice(0, count);
      finalQuestions = pool.map((q: any) => ({
        questionText: q.question_text, options: [], correctOption: null,
        subject: q.subject, category: q.subject, difficulty: q.difficulty || difficulty || "Medium", explanation: "",
      }));
      if (finalQuestions.length < count) {
        try {
          const aiMains = await generateMainsQuestions({ subject: targetSubject, difficulty: difficulty || "medium", count: count - finalQuestions.length, paperType, marksPerQuestion: 15 });
          finalQuestions.push(...aiMains.map((q: any) => ({ questionText: q.questionText, options: [], correctOption: null, subject: q.subject || targetSubject, category: q.category || targetSubject, difficulty: q.difficulty || difficulty || "medium", explanation: "" })));
        } catch {}
      }
    } else {
      if (await hasStudyMaterial(targetSubject)) {
        try { finalQuestions = await generateMockTestFromRAG({ subject: targetSubject, topic: req.body.topic, difficulty: difficulty || "mixed", questionCount: count, examMode: examMode || "prelims" }); } catch {}
      }
      if (finalQuestions.length < count) {
        const remaining = count - finalQuestions.length;
        const PRIORITY = ["Polity","Economy","Geography","Environment","History","Science","Current Affairs","International","Ethics","Society","Agriculture"];
        const EXCLUDE = ["Sports","Entertainment","Lifestyle"];
        const pyqPool = await mockTestRepo.findPYQQuestions(subject, !subject || subject === "All Subjects" ? EXCLUDE : undefined, Math.max(remaining * 3, 30));
        let pyqQuestions: any[];
        if (!subject || subject === "All Subjects") {
          const buckets: Record<string, any[]> = {};
          for (const q of pyqPool) { const key = PRIORITY.find(p => (q.subject || "").toLowerCase().includes(p.toLowerCase())) || "Other"; (buckets[key] = buckets[key] || []).push(q); }
          const ordered: any[] = []; const keys = [...PRIORITY, "Other"];
          while (ordered.length < Math.ceil(remaining / 2)) { for (const key of keys) { if (buckets[key]?.length > 0) { ordered.push(buckets[key].shift()); if (ordered.length >= Math.ceil(remaining / 2)) break; } } if (!ordered.length) break; }
          pyqQuestions = ordered;
        } else { pyqQuestions = pyqPool.slice(0, Math.ceil(remaining / 2)); }
        const aiCount = remaining - pyqQuestions.length;
        let aiQuestions: any[] = [];
        if (aiCount > 0) try { aiQuestions = await generateMCQQuestions({ subject: targetSubject, difficulty: difficulty || "medium", count: aiCount, examMode: examMode || "prelims" }); } catch {}
        finalQuestions = [...finalQuestions, ...pyqQuestions.map((q: any) => ({ questionText: q.question_text, options: q.options, correctOption: q.correct_option || "A", subject: q.subject, category: q.subject, difficulty: q.difficulty, explanation: q.explanation || "" })), ...aiQuestions];
      }
    }

    if (finalQuestions.length === 0) {
      await mockTestRepo.deleteTest(mockTest.id);
      return res.status(500).json({ status: "error", message: "Unable to generate questions. Please retry." });
    }

    let questionNum = 1;
    const questionsToInsert = finalQuestions.slice(0, count).map((q: any) => ({
      id: randomUUID(), mock_test_id: mockTest.id, question_num: questionNum++,
      question_text: q.questionText, subject: q.subject || targetSubject,
      category: q.category || q.subject || targetSubject, difficulty: q.difficulty || difficulty || "Medium",
      options: isMainsMode ? [] : (q.options || [{ id: "A", text: "A" }, { id: "B", text: "B" }, { id: "C", text: "C" }, { id: "D", text: "D" }]),
      correct_option: isMainsMode ? "N/A" : (q.correctOption || "A"), explanation: q.explanation || "",
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
