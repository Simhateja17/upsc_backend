import prisma from "../config/database";
import { invokeModelJSON } from "../config/bedrock";

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
 * Create daily MCQ set by rotating from approved PYQ bank
 */
export async function rotateDailyMCQ(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Check if already created
  const existing = await prisma.dailyMCQ.findUnique({
    where: { date: tomorrow },
  });
  if (existing) {
    console.log("[DailyMCQ] Already created for tomorrow");
    return;
  }

  const questionCount = 10;

  // Get approved PYQ questions, weighted by subject coverage
  // Try to pick questions from diverse subjects
  const questions = [];

  for (const subject of UPSC_SUBJECTS) {
    if (questions.length >= questionCount) break;

    const subjectQuestions = await prisma.pYQQuestion.findMany({
      where: {
        status: "approved",
        subject: { contains: subject, mode: "insensitive" },
      },
      take: 2, // 2 per subject max to ensure diversity
      orderBy: { createdAt: "desc" },
    });

    questions.push(...subjectQuestions);
  }

  // If we don't have enough from PYQ bank, that's ok — take what we have
  const selectedQuestions = questions.slice(0, questionCount);

  if (selectedQuestions.length === 0) {
    console.log("[DailyMCQ] No approved PYQ questions available. Skipping.");
    return;
  }

  // Determine the primary topic from selected questions
  const subjectCounts: Record<string, number> = {};
  for (const q of selectedQuestions) {
    subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
  }
  const primaryTopic = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Create DailyMCQ record
  const dailyMcq = await prisma.dailyMCQ.create({
    data: {
      date: tomorrow,
      title: `Daily Challenge — ${primaryTopic}`,
      topic: primaryTopic,
      tags: Object.keys(subjectCounts),
      questionCount: selectedQuestions.length,
      timeLimit: selectedQuestions.length * 2, // 2 min per question
      totalMarks: selectedQuestions.length * 2,
      isActive: true,
    },
  });

  // Create MCQQuestion records linked to the daily MCQ
  for (let i = 0; i < selectedQuestions.length; i++) {
    const pyq = selectedQuestions[i];
    await prisma.mCQQuestion.create({
      data: {
        dailyMcqId: dailyMcq.id,
        questionNum: i + 1,
        questionText: pyq.questionText,
        category: pyq.subject,
        difficulty: pyq.difficulty,
        options: pyq.options as any,
        correctOption: pyq.correctOption || "A",
        explanation: pyq.explanation,
      },
    });
  }

  console.log(
    `[DailyMCQ] Created for ${tomorrow.toISOString().split("T")[0]} with ${selectedQuestions.length} questions`
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
