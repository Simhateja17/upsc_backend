import prisma from "../config/database";
import { invokeModelJSON } from "../config/llm";
import { isValidSubject, normalizeSubject, VALID_UPSC_SUBJECTS } from "../constants/subjects";

/**
 * UPSC subject taxonomy — sourced from the shared categorizer categories.
 * Only subjects relevant for MCQ/mains question generation.
 */
const UPSC_SUBJECTS = [...VALID_UPSC_SUBJECTS];
const DAILY_MCQ_QUESTION_COUNT = 10;
const DAILY_MCQ_TIME_LIMIT_MINUTES = 10;
const DAILY_MCQ_MARKS_PER_QUESTION = 2;
const APP_TIME_ZONE = "Asia/Kolkata";

interface MCQItem {
  sourceQuestionBankId: string;
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

function dateOnlyUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function getTodayInAppTimeZone(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return dateOnlyUTC(year, month, day);
}

/**
 * Ensure today's MCQ exists. Called on-demand when a user visits Daily MCQ.
 */
export async function ensureTodayMCQ(): Promise<void> {
  const today = getTodayInAppTimeZone();
  return createDailyMCQForDate(today);
}

/**
 * Generate the current IST day's MCQ set (called by cron job).
 */
export async function rotateDailyMCQ(): Promise<void> {
  return createDailyMCQForDate(getTodayInAppTimeZone());
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
  id?: string;
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
    sourceQuestionBankId: q.id || "",
    questionText: q.questionText,
    options: q.options,
    correctOption: q.correctOption || "A",
    explanation: q.explanation || null,
    subject,
    difficulty: q.difficulty || "Medium",
  };
}

type Difficulty = "Easy" | "Medium" | "Hard";

const DAILY_DIFFICULTY_COUNTS: Record<Difficulty, number> = {
  Easy: 5,
  Medium: 3,
  Hard: 2,
};

async function findDailyQuestionBankRows(targetDate: Date, difficulty: Difficulty, limit: number, excludeIds: string[]) {
  const seed = targetDate.toISOString().slice(0, 10);
  const params: any[] = [difficulty, seed, limit];
  const excludeClause = excludeIds.length > 0 ? `and id <> all($4::text[])` : "";
  if (excludeIds.length > 0) params.push(excludeIds);

  return prisma.$queryRawUnsafe<any[]>(
    `select
       id,
       question_text as "questionText",
       subject,
       difficulty,
       options,
       correct_option as "correctOption",
       explanation
     from public.pyq_question_bank
     where exam = 'prelims'
       and status = 'approved'
       and paper = 'GS-I'
       and lower(difficulty) = lower($1)
       and options is not null
       and coalesce(correct_option, '') <> ''
       ${excludeClause}
       and id not in (
         select q.source_question_bank_id
         from public.mcq_questions q
         join public.daily_mcqs d on d.id = q.daily_mcq_id
         where q.source_question_bank_id is not null
           and d.date >= ($2::date - interval '60 days')
           and d.date < $2::date
       )
     order by md5(id || $2)
     limit $3`,
    ...params
  );
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

  const selectedIds: string[] = [];
  const allQuestions: MCQItem[] = [];

  for (const [difficulty, count] of Object.entries(DAILY_DIFFICULTY_COUNTS) as Array<[Difficulty, number]>) {
    const rows = await findDailyQuestionBankRows(targetDate, difficulty, count, selectedIds);
    const questions = rows
      .map((q) =>
        toDailyMcqItem({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption || "A",
          explanation: q.explanation,
          subject: q.subject,
          difficulty: q.difficulty,
        })
      )
      .filter((q): q is MCQItem => q !== null)
      .slice(0, count);
    selectedIds.push(...questions.map((q) => q.sourceQuestionBankId));
    allQuestions.push(...questions);
  }

  if (allQuestions.length < DAILY_MCQ_QUESTION_COUNT) {
    console.log(
      `[DailyMCQ] Only ${allQuestions.length}/${DAILY_MCQ_QUESTION_COUNT} valid bank questions available. Skipping daily challenge creation.`
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
        sourceQuestionBankId: q.sourceQuestionBankId,
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
    `[DailyMCQ] Created for ${targetDate.toISOString().split("T")[0]} with ${allQuestions.length} question-bank questions`
  );
}

/**
 * Ensure today's mains question exists. Called on-demand when a user visits Daily Answer.
 */
export async function ensureTodayMainsQuestion(): Promise<void> {
  return createDailyMainsQuestionForDate(getTodayInAppTimeZone());
}

/**
 * Create daily mains question using AI
 */
export async function createDailyMainsQuestion(): Promise<void> {
  return createDailyMainsQuestionForDate(getTodayInAppTimeZone());
}

function isUniqueConstraintError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return err?.code === "P2002" || Boolean(err?.message?.includes("Unique constraint failed"));
}

async function createDailyMainsQuestionRecord(
  targetDate: Date,
  data: {
    title: string;
    questionText: string;
    paper: string;
    subject: string;
    marks: number;
    wordLimit: number;
    timeLimit: number;
    instructions: string;
    isActive: boolean;
  }
): Promise<boolean> {
  try {
    await prisma.dailyMainsQuestion.create({
      data: {
        date: targetDate,
        ...data,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      console.log(`[DailyMains] Already created for ${targetDate.toISOString().split("T")[0]}`);
      return false;
    }
    throw error;
  }
}

async function createDailyMainsQuestionForDate(targetDate: Date): Promise<void> {
  // Check if already created
  const existing = await prisma.dailyMainsQuestion.findUnique({
    where: { date: targetDate },
  });
  if (existing) {
    console.log(`[DailyMains] Already created for ${targetDate.toISOString().split("T")[0]}`);
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

    const created = await createDailyMainsQuestionRecord(targetDate, {
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
    });

    if (created) {
      console.log(
        `[DailyMains] Created for ${targetDate.toISOString().split("T")[0]}: ${result.title}`
      );
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      console.log(`[DailyMains] Already created for ${targetDate.toISOString().split("T")[0]}`);
      return;
    }
    console.error("[DailyMains] AI generation failed, creating fallback:", error);

    // Fallback — create a generic question
    await createDailyMainsQuestionRecord(targetDate, {
      title: `${selectedSubject} - Contemporary Analysis`,
      questionText: `Critically examine the recent developments in ${selectedSubject.toLowerCase()} and their implications for India's development trajectory. Suggest a way forward.`,
      paper: selectedPaper.paper,
      subject: selectedSubject,
      marks: 15,
      wordLimit: 250,
      timeLimit: 20,
      instructions:
        "Structure your answer with a clear introduction, balanced arguments, relevant examples, and a conclusion.",
      isActive: true,
    });
  }
}
