import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { supabaseAdmin } from "../config/supabase";
import { embedText } from "../services/embedding.service";

const router = Router();

const SIMILARITY_THRESHOLD = 0.60;
const DEFAULT_MATCH_COUNT = 10;

/**
 * POST /api/search
 * Semantic search across study materials, mock test chunks, and PYQs.
 * Body: { query: string, sources?: ("study" | "mock" | "pyq")[], matchCount?: number, subject?: string }
 */
router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, sources = ["study", "mock", "pyq"], matchCount = DEFAULT_MATCH_COUNT, subject = null } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "query is required" });
    }

    const queryEmbedding = await embedText(query.trim(), "RETRIEVAL_QUERY");

    const searches: Promise<any>[] = [];

    if (sources.includes("study")) {
      searches.push(
        supabaseAdmin.rpc("search_study_chunks", {
          query_embedding: queryEmbedding,
          match_count: matchCount,
          filter_subject: subject,
          filter_topic: null,
        })
      );
    } else {
      searches.push(Promise.resolve({ data: [] }));
    }

    if (sources.includes("mock")) {
      searches.push(
        supabaseAdmin.rpc("search_mock_test_chunks", {
          query_embedding: queryEmbedding,
          match_count: matchCount,
          filter_subject: subject,
          filter_topic: null,
        })
      );
    } else {
      searches.push(Promise.resolve({ data: [] }));
    }

    if (sources.includes("pyq")) {
      searches.push(
        supabaseAdmin.rpc("search_pyq_chunks", {
          query_embedding: queryEmbedding,
          match_count: matchCount,
          filter_subject: subject,
        })
      );
    } else {
      searches.push(Promise.resolve({ data: [] }));
    }

    const [studyRes, mockRes, pyqRes] = await Promise.all(searches);

    const results = [
      ...(studyRes.data || []).map((r: any) => ({ ...r, source: "study" })),
      ...(mockRes.data || []).map((r: any) => ({ ...r, source: "mock" })),
      ...(pyqRes.data || []).map((r: any) => ({ ...r, source: "pyq" })),
    ]
      .filter((r) => r.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);

    res.json({ status: "success", data: { query, results } });
  } catch (error) {
    next(error);
  }
});

export default router;
