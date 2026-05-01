-- RPC: search_study_chunks
-- Performs cosine similarity search over study_material_chunks
-- Used by the RAG pipeline to retrieve relevant context for question generation

CREATE OR REPLACE FUNCTION search_study_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_subject text DEFAULT NULL,
  filter_topic text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id::text,
    chunk_text,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM study_material_chunks
  WHERE
    (filter_subject IS NULL OR metadata->>'subject' ILIKE filter_subject)
    AND (filter_topic IS NULL OR metadata->>'topic' ILIKE filter_topic)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


-- RPC: search_mock_test_chunks
-- Performs cosine similarity search over mock_test_chunks
-- Used when mock test PDFs (past papers) are uploaded and need to be retrieved for generation

CREATE OR REPLACE FUNCTION search_mock_test_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_subject text DEFAULT NULL,
  filter_topic text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id::text,
    chunk_text,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM mock_test_chunks
  WHERE
    (filter_subject IS NULL OR metadata->>'subject' ILIKE filter_subject)
    AND (filter_topic IS NULL OR metadata->>'topic' ILIKE filter_topic)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
