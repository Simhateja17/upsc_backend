-- ============================================================
-- PYQ RAG Pipeline — Run these in Supabase SQL Editor
-- ============================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create pyq_chunks table with vector column
CREATE TABLE IF NOT EXISTS "pyq_chunks" (
  id          TEXT PRIMARY KEY,
  upload_id   TEXT NOT NULL REFERENCES "pyq_uploads"(id) ON DELETE CASCADE,
  page_number INT  NOT NULL DEFAULT 1,
  chunk_index INT  NOT NULL DEFAULT 0,
  chunk_text  TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS pyq_chunks_embedding_idx
  ON "pyq_chunks" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS pyq_chunks_upload_id_idx
  ON "pyq_chunks" (upload_id);

-- Step 4: Create vector search function
CREATE OR REPLACE FUNCTION search_pyq_chunks(
  query_embedding vector(1536),
  match_count     int     DEFAULT 5,
  filter_year     int     DEFAULT NULL,
  filter_paper    text    DEFAULT NULL
)
RETURNS TABLE (
  id         text,
  chunk_text text,
  metadata   jsonb,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    chunk_text,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM "pyq_chunks"
  WHERE
    (filter_year  IS NULL OR (metadata->>'year')::int  = filter_year)
    AND (filter_paper IS NULL OR metadata->>'paper'        = filter_paper)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
