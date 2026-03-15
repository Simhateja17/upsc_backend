import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

const MAINS_PAPERS = ["GS-I", "GS-II", "GS-III", "GS-IV", "Essay"];

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

/**
 * GET /api/pyq/questions
 * Public endpoint — returns approved questions with optional filters.
 * mode=prelims → excludes mains papers
 * mode=mains   → includes only mains papers
 */
export const getPublicPYQQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const mode = qs(req.query.mode as string);
    const subject = qs(req.query.subject as string);
    const year = qs(req.query.year as string);
    const paper = qs(req.query.paper as string);
    const page = parseInt(qs(req.query.page as string) || "1");
    const limit = parseInt(qs(req.query.limit as string) || "20");
    const skip = (page - 1) * limit;

    console.log(`[PYQ] Query params: mode=${mode}, subject=${subject}, year=${year}, paper=${paper}, page=${page}, limit=${limit}`);

    const where: any = { status: "approved" };

    if (mode === "mains") {
      where.paper = { in: MAINS_PAPERS };
    } else if (mode === "prelims") {
      where.paper = { notIn: MAINS_PAPERS };
    }

    if (subject && subject !== "All Papers") {
      where.subject = { contains: subject, mode: "insensitive" };
    }
    if (year) where.year = parseInt(year);
    if (paper) where.paper = paper;

    const [questions, total] = await Promise.all([
      prisma.pYQQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pYQQuestion.count({ where }),
    ]);

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
