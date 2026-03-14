import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

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
    console.log(`[PYQ] Fetching questions: mode=${req.query.mode}, subject=${req.query.subject}, year=${req.query.year}, page=${req.query.page}`);
    if (!supabaseAdmin) {
      return res.status(503).json({ status: "error", message: "Service unavailable" });
    }

    const mode = qs(req.query.mode as string);
    const subject = qs(req.query.subject as string);
    const year = qs(req.query.year as string);
    const paper = qs(req.query.paper as string);
    const page = parseInt(qs(req.query.page as string) || "1");
    const limit = parseInt(qs(req.query.limit as string) || "20");
    const skip = (page - 1) * limit;

    const buildQuery = (countOnly = false) => {
      let q = supabaseAdmin!
        .from("pyq_questions")
        .select(
          countOnly
            ? "*"
            : "id, year, paper, question_text, subject, topic, difficulty, options, correct_option, explanation",
          countOnly ? { count: "exact", head: true } : { count: "exact" }
        )
        .eq("status", "approved");

      if (mode === "mains") {
        q = q.in("paper", MAINS_PAPERS);
      } else if (mode === "prelims") {
        q = q.not("paper", "in", `(${MAINS_PAPERS.join(",")})`);
      }

      if (subject && subject !== "All Papers") {
        q = q.ilike("subject", `%${subject}%`);
      }
      if (year) q = q.eq("year", parseInt(year));
      if (paper) q = q.eq("paper", paper);

      return q;
    };

    // Get count
    const { count, error: countError } = await buildQuery(true);
    if (countError) throw countError;

    // Get paginated data
    const { data: questions, error: dataError } = await buildQuery(false)
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);

    if (dataError) throw dataError;

    // Map snake_case to camelCase for frontend compatibility
    const mapped = (questions || []).map((q: any) => ({
      id: q.id,
      year: q.year,
      paper: q.paper,
      questionText: q.question_text,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      options: q.options,
      correctOption: q.correct_option,
      explanation: q.explanation,
    }));

    res.json({
      status: "success",
      data: {
        questions: mapped,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
