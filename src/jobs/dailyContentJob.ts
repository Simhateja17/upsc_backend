import prisma from "../config/database";
import { invokeModelJSON } from "../config/llm";
import { generateMCQQuestions } from "../services/questionGenerator";
import { isValidSubject, normalizeSubject, VALID_UPSC_SUBJECTS } from "../constants/subjects";

/**
 * UPSC subject taxonomy — sourced from the shared categorizer categories.
 * Only subjects relevant for MCQ/mains question generation.
 */
const UPSC_SUBJECTS = [...VALID_UPSC_SUBJECTS];
const DAILY_MCQ_QUESTION_COUNT = 10;
const DAILY_MCQ_TIME_LIMIT_MINUTES = 10;
const DAILY_MCQ_MARKS_PER_QUESTION = 2;

interface MCQItem {
  questionText: string;
  options: any;
  correctOption: string;
  explanation: string | null;
  subject: string;
  difficulty: string;
}

/**
 * Shuffle an array in place (Fisher-Yates)
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Ensure today's MCQ exists. Called on-demand when a user visits Daily MCQ.
 */
export async function ensureTodayMCQ(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return createDailyMCQForDate(today);
}

/**
 * Pre-generate tomorrow's MCQ (called by cron job)
 */
export async function rotateDailyMCQ(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return createDailyMCQForDate(tomorrow);
}

/**
 * Create daily MCQ set for a given date: 5 PYQ + 5 AI-generated questions, mixed randomly
 */
async function deleteIncompleteDailyMCQ(id: string): Promise<void> {
  const completedAttempts = await prisma.mCQAttempt.count({
    where: { dailyMcqId: id, completedAt: { not: null } },
  });
  if (completedAttempts > 0) return;

  await prisma.mCQResponse.deleteMany({ where: { attempt: { dailyMcqId: id } } });
  await prisma.mCQAttempt.deleteMany({ where: { dailyMcqId: id } });
  await prisma.mCQQuestion.deleteMany({ where: { dailyMcqId: id } });
  await prisma.dailyMCQ.delete({ where: { id } });
}

function hasValidOptions(options: any): boolean {
  if (!options) return false;
  if (Array.isArray(options)) {
    return options.length >= 2 && options.every((o: any) => o && (o.text || o.value));
  }
  if (typeof options === "object") {
    return Object.keys(options).length >= 2;
  }
  return false;
}

function toDailyMcqItem(q: {
  questionText: string;
  options: any;
  correctOption?: string | null;
  explanation?: string | null;
  subject?: string | null;
  category?: string | null;
  difficulty?: string | null;
}) {
  const subject = normalizeSubject(q.subject || q.category || "");
  if (!isValidSubject(subject)) return null;
  if (!hasValidOptions(q.options)) return null;

  return {
    questionText: q.questionText,
    options: q.options,
    correctOption: q.correctOption || "A",
    explanation: q.explanation || null,
    subject,
    difficulty: q.difficulty || "Medium",
  };
}

async function createDailyMCQForDate(targetDate: Date): Promise<void> {
  // Check if already created
  const existing = await prisma.dailyMCQ.findUnique({
    where: { date: targetDate },
    include: { questions: true },
  });
  if (existing) {
    const validQuestionCount = existing.questions.filter((q) => isValidSubject(normalizeSubject(q.category))).length;
    if (validQuestionCount < DAILY_MCQ_QUESTION_COUNT || existing.questionCount !== DAILY_MCQ_QUESTION_COUNT) {
      await deleteIncompleteDailyMCQ(existing.id);
      const stillExists = await prisma.dailyMCQ.findUnique({ where: { date: targetDate } });
      if (stillExists) {
        console.log(
          `[DailyMCQ] Existing attempted set for ${targetDate.toISOString().split("T")[0]} has ${validQuestionCount} valid questions; not replacing.`
        );
        return;
      }
    } else {
      console.log(`[DailyMCQ] Already created for ${targetDate.toISOString().split("T")[0]}`);
      return;
    }
  }

  const PYQ_COUNT = 5;
  const AI_COUNT = DAILY_MCQ_QUESTION_COUNT - PYQ_COUNT;

  // ── Step 1: Get 5 PYQ questions (diverse subjects) ──
  const pyqQuestions = [];
  const shuffledSubjects = shuffle([...UPSC_SUBJECTS]);

  for (const subject of shuffledSubjects) {
    if (pyqQuestions.length >= PYQ_COUNT) break;

    const subjectQuestions = await prisma.pYQQuestion.findMany({
      where: {
        status: "approved",
        subject: { contains: subject, mode: "insensitive" },
      },
      take: 1,
      orderBy: { createdAt: "desc" },
    });

    pyqQuestions.push(...subjectQuestions);
  }

  // If we still need more PYQ, fill from any subject
  if (pyqQuestions.length < PYQ_COUNT) {
    const pyqIds = pyqQuestions.map((q) => q.id);
    const extra = await prisma.pYQQuestion.findMany({
      where: {
        status: "approved",
        id: { notIn: pyqIds },
      },
      take: PYQ_COUNT - pyqQuestions.length,
      orderBy: { createdAt: "desc" },
    });
    pyqQuestions.push(...extra);
  }

  const validPyqQuestions = pyqQuestions
    .map((q) =>
      toDailyMcqItem({
        questionText: q.questionText,
        options: q.options as any,
        correctOption: q.correctOption || "A",
        explanation: q.explanation,
        subject: q.subject,
        difficulty: q.difficulty,
      })
    )
    .filter((q): q is MCQItem => q !== null)
    .slice(0, PYQ_COUNT);

  // ── Step 2: Generate 5 AI questions (pick 2-3 random subjects) ──
  const aiSubjects = shuffle([...UPSC_SUBJECTS]).slice(0, 3);
  let aiQuestions: Array<{
    questionText: string;
    options: any;
    correctOption: string;
    explanation: string | null;
    subject: string;
    difficulty: string;
  }> = [];

  try {
    // Generate questions spread across selected subjects
    const questionsPerSubject = [2, 2, 1]; // 5 total across 3 subjects
    for (let i = 0; i < aiSubjects.length && aiQuestions.length < AI_COUNT; i++) {
      const needed = Math.min(questionsPerSubject[i], AI_COUNT - aiQuestions.length);
      const generated = await generateMCQQuestions({
        subject: aiSubjects[i],
        difficulty: "Medium",
        count: needed,
      });
      aiQuestions.push(
        ...generated.map((g) => ({
          questionText: g.questionText,
          options: g.options,
          correctOption: g.correctOption || "A",
          explanation: g.explanation || null,
          subject: g.subject || aiSubjects[i],
          difficulty: g.difficulty || "Medium",
        }))
      );
    }

    while (validPyqQuestions.length + aiQuestions.length < DAILY_MCQ_QUESTION_COUNT) {
      const subject = UPSC_SUBJECTS[aiQuestions.length % UPSC_SUBJECTS.length];
      const needed = DAILY_MCQ_QUESTION_COUNT - validPyqQuestions.length - aiQuestions.length;
      const generated = await generateMCQQuestions({
        subject,
        difficulty: "Medium",
        count: Math.min(needed, 3),
      });
      if (generated.length === 0) break;
      aiQuestions.push(
        ...generated.map((g) => ({
          questionText: g.questionText,
          options: g.options,
          correctOption: g.correctOption || "A",
          explanation: g.explanation || null,
          subject: g.subject || subject,
          difficulty: g.difficulty || "Medium",
        }))
      );
    }
    console.log(`[DailyMCQ] AI generated ${aiQuestions.length} questions`);
  } catch (error) {
    console.error("[DailyMCQ] AI question generation failed:", error);
  }

  // ── Step 3: Combine and shuffle ──
  const allQuestions: MCQItem[] = [
    ...validPyqQuestions,
    ...aiQuestions,
  ].map(toDailyMcqItem).filter((q): q is MCQItem => q !== null).slice(0, DAILY_MCQ_QUESTION_COUNT);

  if (allQuestions.length < DAILY_MCQ_QUESTION_COUNT) {
    console.log(
      `[DailyMCQ] Only ${allQuestions.length}/${DAILY_MCQ_QUESTION_COUNT} valid questions available. Skipping daily challenge creation.`
    );
    return;
  }

  // Shuffle to mix PYQ and AI questions randomly
  shuffle(allQuestions);

  // Determine the primary topic
  const subjectCounts: Record<string, number> = {};
  for (const q of allQuestions) {
    subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
  }
  const primaryTopic = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Create DailyMCQ record
  const dailyMcq = await prisma.dailyMCQ.create({
    data: {
      date: targetDate,
      title: `Daily Challenge — ${primaryTopic}`,
      topic: primaryTopic,
      tags: Object.keys(subjectCounts),
      questionCount: DAILY_MCQ_QUESTION_COUNT,
      timeLimit: DAILY_MCQ_TIME_LIMIT_MINUTES,
      totalMarks: DAILY_MCQ_QUESTION_COUNT * DAILY_MCQ_MARKS_PER_QUESTION,
      isActive: true,
    },
  });

  // Create MCQQuestion records linked to the daily MCQ
  for (let i = 0; i < allQuestions.length; i++) {
    const q = allQuestions[i];
    await prisma.mCQQuestion.create({
      data: {
        dailyMcqId: dailyMcq.id,
        questionNum: i + 1,
        questionText: q.questionText,
        category: q.subject,
        difficulty: q.difficulty,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation,
      },
    });
  }

  console.log(
    `[DailyMCQ] Created for ${targetDate.toISOString().split("T")[0]} with ${allQuestions.length} questions (${pyqQuestions.length} PYQ + ${aiQuestions.length} AI)`
  );
}

/**
 * Create daily mains question using AI
 */
export async function createDailyMainsQuestion(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Check if already created
  const existing = await prisma.dailyMainsQuestion.findUnique({
    where: { date: tomorrow },
  });
  if (existing) {
    console.log("[DailyMains] Already created for tomorrow");
    return;
  }

  // Pick a random subject and paper
  const papers = [
    { paper: "GS Paper I", subjects: ["History", "Geography", "Society"] },
    { paper: "GS Paper II", subjects: ["Polity", "Governance", "International Relations"] },
    { paper: "GS Paper III", subjects: ["Economy", "Environment", "Science & Tech", "Security"] },
    { paper: "GS Paper IV", subjects: ["Ethics", "Integrity", "Aptitude"] },
  ];

  const selectedPaper = papers[Math.floor(Math.random() * papers.length)];
  const selectedSubject =
    selectedPaper.subjects[Math.floor(Math.random() * selectedPaper.subjects.length)];

  try {
    const result = await invokeModelJSON<{
      title: string;
      questionText: string;
      instructions: string;
    }>(
      [
        {
          role: "user",
          content: `Generate a UPSC Mains question for ${selectedPaper.paper} on "${selectedSubject}".

Return a JSON object with:
{
  "title": "Short title for the question (5-8 words)",
  "questionText": "Full question text (the actual exam-style question, 2-3 sentences)",
  "instructions": "Any specific instructions for answering"
}

Make it a thought-provoking, analytical question typical of UPSC Mains. Focus on current relevance.`,
        },
      ],
      {
        system:
          "You are a UPSC question paper setter. Generate exam-quality Mains questions. Return valid JSON only.",
        maxTokens: 512,
        temperature: 0.7,
        serviceName: "dailyMainsQuestion",
      }
    );

    await prisma.dailyMainsQuestion.create({
      data: {
        date: tomorrow,
        title: result.title || `${selectedSubject} Analysis`,
        questionText:
          result.questionText ||
          `Discuss the key challenges in ${selectedSubject} and suggest measures to address them.`,
        paper: selectedPaper.paper,
        subject: selectedSubject,
        marks: 15,
        wordLimit: 250,
        timeLimit: 20,
        instructions:
          result.instructions ||
          "Write a well-structured answer with introduction, body, and conclusion.",
        isActive: true,
      },
    });

    console.log(
      `[DailyMains] Created for ${tomorrow.toISOString().split("T")[0]}: ${result.title}`
    );
  } catch (error) {
    console.error("[DailyMains] AI generation failed, creating fallback:", error);

    // Fallback — create a generic question
    await prisma.dailyMainsQuestion.create({
      data: {
        date: tomorrow,
        title: `${selectedSubject} — Contemporary Analysis`,
        questionText: `Critically examine the recent developments in ${selectedSubject.toLowerCase()} and their implications for India's development trajectory. Suggest a way forward.`,
        paper: selectedPaper.paper,
        subject: selectedSubject,
        marks: 15,
        wordLimit: 250,
        timeLimit: 20,
        instructions:
          "Structure your answer with a clear introduction, balanced arguments, relevant examples, and a conclusion.",
        isActive: true,
      },
    });
  }
}
