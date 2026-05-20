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

    console.log(
      `[PYQ] Query params: mode=${mode}, subject=${subject}, subSubject=${subSubject}, topics=${topics.join("|")}, year=${year}, paper=${paper}, page=${page}, limit=${limit}`
    );

    const where: any = { status: "approved" };

    if (subject && subject !== "All Papers") {
      where.subject = { equals: subject, mode: "insensitive" };
    }
    if (subSubject) {
      where.subSubject = { equals: subSubject, mode: "insensitive" };
    }
    if (topics.length === 1) {
      // Topic strings in dataset can be a comma-separated list; use contains so
      // selecting one topic still matches those rows.
      where.topic = { contains: topics[0], mode: "insensitive" };
    } else if (topics.length > 1) {
      // Multi-topic selection should return questions matching ANY selected topic.
      where.OR = topics.map((topic) => ({
        topic: { contains: topic, mode: "insensitive" },
      }));
    }
    if (year) where.year = parseInt(year);
    if (!year && (yearFrom || yearTo)) {
      where.year = {};
      if (yearFrom) where.year.gte = parseInt(yearFrom);
      if (yearTo) where.year.lte = parseInt(yearTo);
    }
    if (paper) where.paper = paper;

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
      const [total, bySubject, byTopic] = await Promise.all([
        prisma.pYQMainsQuestion.count({ where }),
        prisma.pYQMainsQuestion.groupBy({
          by: ["subject"],
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
          bySubSubject: [],
          byTopic: byTopic.map((t: any) => ({
            subject: t.subject,
            subSubject: null,
            topic: t.topic,
            count: t._count.id,
          })),
        },
      });
    }

    const [total, bySubject, bySubSubject, byTopic] = await Promise.all([
      prisma.pYQQuestion.count({ where }),
      prisma.pYQQuestion.groupBy({
        by: ["subject"],
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
