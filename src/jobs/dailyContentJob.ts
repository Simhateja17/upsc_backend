import prisma from "../config/database";
import { invokeModelJSON } from "../config/llm";
import { generateMCQQuestions } from "../services/questionGenerator";

const UPSC_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "International Relations",
];

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
async function createDailyMCQForDate(targetDate: Date): Promise<void> {
  // Check if already created
  const existing = await prisma.dailyMCQ.findUnique({
    where: { date: targetDate },
  });
  if (existing) {
    console.log(`[DailyMCQ] Already created for ${targetDate.toISOString().split("T")[0]}`);
    return;
  }

  const PYQ_COUNT = 5;
  const AI_COUNT = 5;

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
    console.log(`[DailyMCQ] AI generated ${aiQuestions.length} questions`);
  } catch (error) {
    console.error("[DailyMCQ] AI question generation failed:", error);
  }

  // ── Step 3: Combine and shuffle ──
  interface MCQItem {
    questionText: string;
    options: any;
    correctOption: string;
    explanation: string | null;
    subject: string;
    difficulty: string;
  }

  const allQuestions: MCQItem[] = [
    ...pyqQuestions.map((q) => ({
      questionText: q.questionText,
      options: q.options as any,
      correctOption: q.correctOption || "A",
      explanation: q.explanation,
      subject: q.subject,
      difficulty: q.difficulty,
    })),
    ...aiQuestions,
  ];

  if (allQuestions.length === 0) {
    console.log("[DailyMCQ] No questions available (PYQ or AI). Skipping.");
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
      questionCount: allQuestions.length,
      timeLimit: allQuestions.length * 2, // 2 min per question
      totalMarks: allQuestions.length * 2,
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
