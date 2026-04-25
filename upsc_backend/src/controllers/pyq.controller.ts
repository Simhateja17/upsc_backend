import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
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
    const year = qs(req.query.year as string);
    const paper = qs(req.query.paper as string);
    const page = parseInt(qs(req.query.page as string) || "1");
    const limit = parseInt(qs(req.query.limit as string) || "20");
    const skip = (page - 1) * limit;

    console.log(
      `[PYQ] Query params: mode=${mode}, subject=${subject}, year=${year}, paper=${paper}, page=${page}, limit=${limit}`
    );

    const where: any = { status: "approved" };

    if (subject && subject !== "All Papers") {
      where.subject = { contains: subject, mode: "insensitive" };
    }
    if (year) where.year = parseInt(year);
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
