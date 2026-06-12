import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

function qsList(val: string | string[] | undefined): string[] {
  const raw = Array.isArray(val) ? val : val ? [val] : [];
  return raw
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function paperAliases(paper: string): string[] {
  const normalized = paper.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases: Record<string, string[]> = {
    gsi: ["GS-I", "GS Paper I", "GS Paper 1"],
    gspaperi: ["GS-I", "GS Paper I", "GS Paper 1"],
    gspaper1: ["GS-I", "GS Paper I", "GS Paper 1"],
    gsii: ["GS-II", "GS Paper II", "GS Paper 2"],
    gspaperii: ["GS-II", "GS Paper II", "GS Paper 2"],
    gspaper2: ["GS-II", "GS Paper II", "GS Paper 2"],
    gsiii: ["GS-III", "GS Paper III", "GS Paper 3"],
    gspaperiii: ["GS-III", "GS Paper III", "GS Paper 3"],
    gspaper3: ["GS-III", "GS Paper III", "GS Paper 3"],
    gsiv: ["GS-IV", "GS Paper IV", "GS Paper 4"],
    gspaperiv: ["GS-IV", "GS Paper IV", "GS Paper 4"],
    gspaper4: ["GS-IV", "GS Paper IV", "GS Paper 4"],
    essay: ["Essay", "Essay Paper"],
    essaypaper: ["Essay", "Essay Paper"],
  };
  return aliases[normalized] || [paper];
}

async function shouldUseQuestionBank(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `select count(*)::text as count from public.pyq_question_bank where exam = 'prelims' and status = 'approved'`
    );
    return Number(rows[0]?.count || 0) > 0;
  } catch {
    return false;
  }
}

function pushParam(params: any[], value: any): string {
  params.push(value);
  return `$${params.length}`;
}

function buildQuestionBankWhere(req: Request): { clause: string; params: any[]; page: number; limit: number } {
  const subject = qs(req.query.subject as string);
  const subSubject = qs(req.query.subSubject as string) || qs(req.query.sub_subject as string);
  const topics = qsList(req.query.topic as string | string[]);
  const year = qs(req.query.year as string);
  const years = qsList(req.query.years as string | string[]);
  const yearFrom = qs(req.query.yearFrom as string);
  const yearTo = qs(req.query.yearTo as string);
  const paper = qs(req.query.paper as string);
  const page = parseInt(qs(req.query.page as string) || "1");
  const limit = parseInt(qs(req.query.limit as string) || "20");
  const params: any[] = [];
  const where = ["exam = 'prelims'", "status = 'approved'"];

  if (subject && subject !== "All Papers") {
    where.push(`subject ilike ${pushParam(params, subject)}`);
  }
  if (subSubject) {
    where.push(`sub_subject ilike ${pushParam(params, subSubject)}`);
  }
  if (topics.length === 1) {
    where.push(`topic ilike ${pushParam(params, `%${topics[0]}%`)}`);
  } else if (topics.length > 1) {
    const topicClauses = topics.map((topic) => `topic ilike ${pushParam(params, `%${topic}%`)}`);
    where.push(`(${topicClauses.join(" or ")})`);
  }
  if (years.length > 0) {
    const parsedYears = years.map((y) => parseInt(y, 10)).filter(Number.isFinite);
    if (parsedYears.length > 0) where.push(`year = any(${pushParam(params, parsedYears)}::int[])`);
  } else if (year) {
    where.push(`year = ${pushParam(params, parseInt(year, 10))}`);
  } else if (yearFrom || yearTo) {
    if (yearFrom) where.push(`year >= ${pushParam(params, parseInt(yearFrom, 10))}`);
    if (yearTo) where.push(`year <= ${pushParam(params, parseInt(yearTo, 10))}`);
  }
  if (paper) {
    where.push(`paper = any(${pushParam(params, paperAliases(paper))}::text[])`);
  }

  return {
    clause: where.join(" and "),
    params,
    page,
    limit,
  };
}

async function getQuestionBankQuestions(req: Request, res: Response) {
  const { clause, params, page, limit } = buildQuestionBankWhere(req);
  const skip = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `select
       id,
       year,
       paper,
       question_num as "questionNum",
       question_text as "questionText",
       subject,
       sub_subject as "subSubject",
       topic,
       difficulty,
       options,
       correct_option as "correctOption",
       explanation,
       structured_json as "structuredJson",
       source_file as "sourceFile",
       status,
       question_structure as "questionStructure",
       created_at as "createdAt"
     from public.pyq_question_bank
     where ${clause}
     order by year desc, question_num asc, created_at desc
     offset ${pushParam(params, skip)}
     limit ${pushParam(params, limit)}`,
    ...params
  );
  const totalRows = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
    `select count(*)::text as count from public.pyq_question_bank where ${clause}`,
    ...params.slice(0, params.length - 2)
  );
  const total = Number(totalRows[0]?.count || 0);

  res.json({
    status: "success",
    data: {
      questions: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

async function getQuestionBankCounts(req: Request, res: Response) {
  const { clause, params } = buildQuestionBankWhere(req);
  const [totalRows, bySubject, byPaper, bySubSubject, byTopic] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `select count(*)::text as count from public.pyq_question_bank where ${clause}`,
      ...params
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select subject, count(*)::int as count from public.pyq_question_bank where ${clause} group by subject order by subject`,
      ...params
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select paper, count(*)::int as count from public.pyq_question_bank where ${clause} group by paper order by paper`,
      ...params
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select subject, sub_subject as "subSubject", count(*)::int as count
       from public.pyq_question_bank where ${clause}
       group by subject, sub_subject order by subject, sub_subject`,
      ...params
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select subject, sub_subject as "subSubject", topic, count(*)::int as count
       from public.pyq_question_bank where ${clause}
       group by subject, sub_subject, topic order by subject, sub_subject, topic`,
      ...params
    ),
  ]);

  res.json({
    status: "success",
    data: {
      mode: "prelims",
      total: Number(totalRows[0]?.count || 0),
      bySubject: bySubject.map((s: any) => ({ subject: s.subject, count: s.count })),
      byPaper: byPaper.map((p: any) => ({ paper: p.paper, count: p.count })),
      bySubSubject: bySubSubject.map((s: any) => ({
        subject: s.subject,
        subSubject: s.subSubject,
        count: s.count,
      })),
      byTopic: byTopic.map((t: any) => ({
        subject: t.subject,
        subSubject: t.subSubject,
        topic: t.topic,
        count: t.count,
      })),
    },
  });
}

/**
 * GET /api/pyq/questions
 * Public endpoint - returns approved questions with optional filters.
 * mode=prelims -> reads PYQQuestion
 * mode=mains   -> reads PYQMainsQuestion
 */
export const getPublicPYQQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const mode = (qs(req.query.mode as string) || "prelims").toLowerCase();
    if (mode !== "mains" && (await shouldUseQuestionBank())) {
      return getQuestionBankQuestions(req, res);
    }

    const subject = qs(req.query.subject as string);
    const subSubject = qs(req.query.subSubject as string) || qs(req.query.sub_subject as string);
    const topics = qsList(req.query.topic as string | string[]);
    const year = qs(req.query.year as string);
    const yearFrom = qs(req.query.yearFrom as string);
    const yearTo = qs(req.query.yearTo as string);
    const paper = qs(req.query.paper as string);
    const page = parseInt(qs(req.query.page as string) || "1");
    const limit = parseInt(qs(req.query.limit as string) || "20");
    const skip = (page - 1) * limit;
    const effectiveTopics = [...topics];

    const where: any = { status: "approved" };

    if (subject && subject !== "All Papers") {
      where.subject = { equals: subject, mode: "insensitive" };
    }
    if (mode === "mains" && subSubject && effectiveTopics.length === 0) {
      // Backward compatibility: older mains clients send the hierarchy label as `subSubject`.
      // Mains questions only have `topic`, so translate it before building the Prisma filter.
      effectiveTopics.push(subSubject);
    } else if (subSubject) {
      where.subSubject = { equals: subSubject, mode: "insensitive" };
    }
    if (effectiveTopics.length === 1) {
      // Topic strings in dataset can be a comma-separated list; use contains so
      // selecting one topic still matches those rows.
      where.topic = { contains: effectiveTopics[0], mode: "insensitive" };
    } else if (effectiveTopics.length > 1) {
      // Multi-topic selection should return questions matching ANY selected topic.
      where.OR = effectiveTopics.map((topic) => ({
        topic: { contains: topic, mode: "insensitive" },
      }));
    }
    
    console.log(
      `[PYQ] Query params: mode=${mode}, subject=${subject}, subSubject=${subSubject}, topics=${effectiveTopics.join("|")}, year=${year}, paper=${paper}, page=${page}, limit=${limit}`
    );

    if (year) where.year = parseInt(year);
    if (!year && (yearFrom || yearTo)) {
      where.year = {};
      if (yearFrom) where.year.gte = parseInt(yearFrom);
      if (yearTo) where.year.lte = parseInt(yearTo);
    }
    if (paper) where.paper = { in: paperAliases(paper), mode: "insensitive" };

    // UPSC priority subject order for "All Papers" default sort.
    const PRIORITY = [
      "polity", "economy", "geography", "environment",
      "history", "science", "current affairs", "international",
    ];

    // Drop non-UPSC noise from default listing
    const EXCLUDE_SUBJECTS = ["sports", "entertainment", "lifestyle"];

    const [rawQuestions, total] = await Promise.all(
      mode === "mains"
        ? [
            prisma.pYQMainsQuestion.findMany({
              where,
              // Latest year first, latest created as tiebreaker
              orderBy: [{ year: "desc" }, { createdAt: "desc" }],
              skip,
              take: limit * 3, // over-fetch for re-ranking by subject
            }),
            prisma.pYQMainsQuestion.count({ where }),
          ]
        : [
            prisma.pYQQuestion.findMany({
              where,
              orderBy: [{ year: "desc" }, { createdAt: "desc" }],
              skip,
              take: limit * 3,
            }),
            prisma.pYQQuestion.count({ where }),
          ]
    );

    // Drop noise subjects and re-rank by priority when no subject filter is set
    const filtered = rawQuestions.filter((q: any) => {
      const s = (q.subject || "").toLowerCase();
      return !EXCLUDE_SUBJECTS.some((ex) => s.includes(ex));
    });

    let questions = filtered;
    if (!subject || subject === "All Papers") {
      const rank = (subj: string) => {
        const s = (subj || "").toLowerCase();
        const idx = PRIORITY.findIndex((p) => s.includes(p));
        return idx === -1 ? PRIORITY.length : idx;
      };
      questions = [...filtered].sort((a: any, b: any) => {
        if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
        return rank(a.subject) - rank(b.subject);
      });
    }
    questions = questions.slice(0, limit);

    console.log(`[PYQ] Found ${questions.length} questions (total: ${total})`);

    res.json({
      status: "success",
      data: {
        questions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("[PYQ] Error fetching questions:", error);
    next(error);
  }
};

/**
 * GET /api/pyq/counts
 * Public endpoint - returns approved question counts for the sidebar tree.
 */
export const getPublicPYQCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const mode = (qs(req.query.mode as string) || "prelims").toLowerCase();
    if (mode !== "mains" && (await shouldUseQuestionBank())) {
      return getQuestionBankCounts(req, res);
    }

    const year = qs(req.query.year as string);
    const yearFrom = qs(req.query.yearFrom as string);
    const yearTo = qs(req.query.yearTo as string);
    const where: any = { status: "approved" };

    if (year) where.year = parseInt(year);
    if (!year && (yearFrom || yearTo)) {
      where.year = {};
      if (yearFrom) where.year.gte = parseInt(yearFrom);
      if (yearTo) where.year.lte = parseInt(yearTo);
    }

    if (mode === "mains") {
      const [total, bySubject, byPaper, byTopic] = await Promise.all([
        prisma.pYQMainsQuestion.count({ where }),
        prisma.pYQMainsQuestion.groupBy({
          by: ["subject"],
          _count: { id: true },
          where,
        }),
        prisma.pYQMainsQuestion.groupBy({
          by: ["paper"],
          _count: { id: true },
          where,
        }),
        prisma.pYQMainsQuestion.groupBy({
          by: ["subject", "topic"],
          _count: { id: true },
          where,
        }),
      ]);

      return res.json({
        status: "success",
        data: {
          mode,
          total,
          bySubject: bySubject.map((s: any) => ({ subject: s.subject, count: s._count.id })),
          byPaper: byPaper.map((p: any) => ({ paper: p.paper, count: p._count.id })),
          // Mains has no stored `subSubject`, but the UI uses the same hierarchy slot
          // for mains child labels. Expose `topic` values through `bySubSubject` so the
          // existing tree/count UI keeps working.
          bySubSubject: byTopic.map((t: any) => ({
            subject: t.subject,
            subSubject: t.topic,
            count: t._count.id,
          })),
          byTopic: byTopic.map((t: any) => ({
            subject: t.subject,
            subSubject: null,
            topic: t.topic,
            count: t._count.id,
          })),
        },
      });
    }

    const [total, bySubject, byPaper, bySubSubject, byTopic] = await Promise.all([
      prisma.pYQQuestion.count({ where }),
      prisma.pYQQuestion.groupBy({
        by: ["subject"],
        _count: { id: true },
        where,
      }),
      prisma.pYQQuestion.groupBy({
        by: ["paper"],
        _count: { id: true },
        where,
      }),
      prisma.pYQQuestion.groupBy({
        by: ["subject", "subSubject"],
        _count: { id: true },
        where,
      }),
      prisma.pYQQuestion.groupBy({
        by: ["subject", "subSubject", "topic"],
        _count: { id: true },
        where,
      }),
    ]);

    return res.json({
      status: "success",
      data: {
        mode,
        total,
        bySubject: bySubject.map((s: any) => ({ subject: s.subject, count: s._count.id })),
        byPaper: byPaper.map((p: any) => ({ paper: p.paper, count: p._count.id })),
        bySubSubject: bySubSubject.map((s: any) => ({
          subject: s.subject,
          subSubject: s.subSubject,
          count: s._count.id,
        })),
        byTopic: byTopic.map((t: any) => ({
          subject: t.subject,
          subSubject: t.subSubject,
          topic: t.topic,
          count: t._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("[PYQ] Error fetching counts:", error);
    next(error);
  }
};

/**
 * POST /api/pyq/prelims/:questionId/submit
 * Stores a scored PYQ Prelims attempt for leaderboard scoring.
 */
export const submitPyqPrelimsAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const questionId = String(req.params.questionId || "");
    const selectedOption = String(req.body?.selectedOption || "").trim().toUpperCase();

    if (!selectedOption) {
      return res.status(400).json({ status: "error", message: "selectedOption is required" });
    }

    const question = await prisma.pYQQuestion.findFirst({
      where: { id: questionId, status: "approved" },
      select: { id: true, correctOption: true },
    });

    if (!question) {
      let bankRows: Array<{ id: string; correctOption: string | null }> = [];
      try {
        bankRows = await prisma.$queryRawUnsafe<Array<{ id: string; correctOption: string | null }>>(
          `select id, correct_option as "correctOption"
           from public.pyq_question_bank
           where id = $1 and exam = 'prelims' and status = 'approved'
           limit 1`,
          questionId
        );
      } catch {
        bankRows = [];
      }
      const bankQuestion = bankRows[0];
      if (!bankQuestion) {
        return res.status(404).json({ status: "error", message: "PYQ Prelims question not found" });
      }

      const correctOption = bankQuestion.correctOption?.trim().toUpperCase() || null;
      const isCorrect = Boolean(correctOption && selectedOption === correctOption);
      const score = isCorrect ? 1 : 0;
      const accuracy = isCorrect ? 100 : 0;

      await prisma.userActivity.create({
        data: {
          userId,
          type: "mcq",
          title: "Attempted PYQ Prelims",
          description: isCorrect ? "Correct answer" : "Incorrect answer",
        },
      });

      return res.json({
        status: "success",
        data: {
          attemptId: null,
          isCorrect,
          correctOption,
          score,
          totalMarks: 1,
          accuracy,
        },
      });
    }

    const correctOption = question.correctOption?.trim().toUpperCase() || null;
    const isCorrect = Boolean(correctOption && selectedOption === correctOption);
    const score = isCorrect ? 1 : 0;
    const accuracy = isCorrect ? 100 : 0;

    const attempt = await prisma.pyqPrelimsAttempt.upsert({
      where: { userId_pyqQuestionId: { userId, pyqQuestionId: question.id } },
      create: {
        userId,
        pyqQuestionId: question.id,
        selectedOption,
        correctOption,
        isCorrect,
        score,
        totalMarks: 1,
        accuracy,
        completedAt: new Date(),
      },
      update: {
        selectedOption,
        correctOption,
        isCorrect,
        score,
        totalMarks: 1,
        accuracy,
        completedAt: new Date(),
      },
    });

    await prisma.userSeenMCQ.upsert({
      where: { userId_pyqQuestionId: { userId, pyqQuestionId: question.id } },
      create: { userId, pyqQuestionId: question.id },
      update: { seenAt: new Date() },
    });

    await prisma.userActivity.create({
      data: {
        userId,
        type: "mcq",
        title: "Attempted PYQ Prelims",
        description: isCorrect ? "Correct answer" : "Incorrect answer",
      },
    });

    res.json({
      status: "success",
      data: {
        attemptId: attempt.id,
        isCorrect,
        correctOption,
        score,
        totalMarks: 1,
        accuracy,
      },
    });
  } catch (error) {
    next(error);
  }
};
