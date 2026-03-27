-- ============================================================
-- mock_test_chunks_01 — Universal chunk table for ALL PDFs
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create unified chunk table (no FK — upload_id can reference either upload table)
CREATE TABLE IF NOT EXISTS "mock_test_chunks_01" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "upload_id"    TEXT        NOT NULL,
  "upload_type"  TEXT        NOT NULL DEFAULT 'mock_test', -- 'study_material' | 'mock_test'
  "page_number"  INT         NOT NULL DEFAULT 1,
  "chunk_index"  INT         NOT NULL DEFAULT 0,
  "chunk_text"   TEXT        NOT NULL,
  "embedding"    vector(1536),
  "metadata"     JSONB       NOT NULL DEFAULT '{}',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on upload_id for fast per-upload queries
CREATE INDEX IF NOT EXISTS "mock_test_chunks_01_upload_id_idx"
  ON "mock_test_chunks_01" ("upload_id");

-- HNSW vector index for cosine similarity search
CREATE INDEX IF NOT EXISTS "mock_test_chunks_01_embedding_idx"
  ON "mock_test_chunks_01" USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Search function: vector similarity + subject/topic filters
-- ============================================================
CREATE OR REPLACE FUNCTION search_mock_test_chunks_01(
  query_embedding vector(1536),
  match_count     int  DEFAULT 10,
  filter_subject  text DEFAULT NULL,
  filter_topic    text DEFAULT NULL
)
RETURNS TABLE (
  id          text,
  chunk_text  text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    chunk_text,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM "mock_test_chunks_01"
  WHERE
    (filter_subject IS NULL OR metadata->>'subject' ILIKE '%' || filter_subject || '%')
    AND (filter_topic  IS NULL OR metadata->>'topic'   ILIKE '%' || filter_topic   || '%')
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- Optional: migrate existing chunks from old tables
-- Run only if you have data in the old tables
-- ============================================================
-- INSERT INTO "mock_test_chunks_01"
--   (id, upload_id, upload_type, page_number, chunk_index, chunk_text, embedding, metadata, created_at)
-- SELECT id, upload_id, 'study_material', page_number, chunk_index, chunk_text, embedding, metadata, created_at
-- FROM study_material_chunks
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO "mock_test_chunks_01"
--   (id, upload_id, upload_type, page_number, chunk_index, chunk_text, embedding, metadata, created_at)
-- SELECT id, upload_id, 'mock_test', page_number, chunk_index, chunk_text, embedding, metadata, created_at
-- FROM mock_test_chunks
-- ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT COUNT(*) AS total_chunks FROM "mock_test_chunks_01";
