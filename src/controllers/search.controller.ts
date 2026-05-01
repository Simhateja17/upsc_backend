import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { embedText } from "../services/embedding.service";

const SIMILARITY_THRESHOLD = 0.65;

export const semanticSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    const subject = (req.query.subject as string) || null;
    const topic = (req.query.topic as string) || null;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    if (!q) {
      res.status(400).json({ status: "error", message: "Query parameter 'q' is required" });
      return;
    }

    if (!supabaseAdmin) {
      res.status(503).json({ status: "error", message: "Search service unavailable" });
      return;
    }

    const queryEmbedding = await embedText(q, "RETRIEVAL_QUERY");

    const [studyRes, mockRes] = await Promise.all([
      supabaseAdmin.rpc("search_study_chunks", {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_subject: subject,
        filter_topic: topic,
      }),
      supabaseAdmin.rpc("search_mock_test_chunks", {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_subject: subject,
        filter_topic: topic,
      }),
    ]);

    const allResults = [
      ...((studyRes.data || []) as any[]).map((r) => ({ ...r, source: "study_material" })),
      ...((mockRes.data || []) as any[]).map((r) => ({ ...r, source: "mock_test_material" })),
    ]
      .filter((r) => r.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ chunk_text, metadata, similarity, source }) => ({
        chunk_text,
        metadata,
        similarity: Math.round(similarity * 1000) / 1000,
        source,
      }));

    res.json({
      status: "success",
      data: {
        query: q,
        results: allResults,
        total: allResults.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
