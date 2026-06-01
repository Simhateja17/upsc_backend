CREATE EXTENSION IF NOT EXISTS vector;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('topper-pdfs', 'topper-pdfs', false, 52428800),
  ('topper-answer-pages', 'topper-answer-pages', false, 52428800),
  ('checked-copies', 'checked-copies', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "topper_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "file_name" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "paper_group" TEXT NOT NULL,
  "source_name" TEXT,
  "exam_context" TEXT NOT NULL DEFAULT 'coaching_test_series',
  "candidate_name" TEXT,
  "test_code" TEXT,
  "total_pages" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "topper_document_pages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_id" TEXT NOT NULL REFERENCES "topper_documents"("id") ON DELETE CASCADE,
  "page_no" INTEGER NOT NULL,
  "image_path" TEXT NOT NULL,
  "raw_ocr_text" TEXT NOT NULL,
  "structured_json" JSONB,
  "page_type" TEXT,
  "confidence_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "topper_document_pages_document_id_page_no_key" UNIQUE ("document_id", "page_no")
);

CREATE TABLE IF NOT EXISTS "topper_answers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_id" TEXT NOT NULL REFERENCES "topper_documents"("id") ON DELETE CASCADE,
  "question_no" INTEGER,
  "question_text" TEXT,
  "paper_group" TEXT NOT NULL,
  "subject" TEXT,
  "topic" TEXT,
  "directive" TEXT,
  "max_marks" INTEGER,
  "awarded_marks" DOUBLE PRECISION,
  "score_band" TEXT,
  "student_answer_text" TEXT NOT NULL,
  "evaluator_notes_json" JSONB,
  "answer_structure_json" JSONB,
  "page_start" INTEGER NOT NULL,
  "page_end" INTEGER NOT NULL,
  "source_page_ids" JSONB NOT NULL DEFAULT '[]',
  "quality_status" TEXT NOT NULL DEFAULT 'bronze',
  "confidence_json" JSONB,
  "usable_for_rag" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "topper_answer_embeddings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "answer_id" TEXT NOT NULL REFERENCES "topper_answers"("id") ON DELETE CASCADE,
  "chunk_type" TEXT NOT NULL,
  "chunk_text" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "embedding" vector(1536),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "topper_documents_paper_group_idx" ON "topper_documents" ("paper_group");
CREATE INDEX IF NOT EXISTS "topper_documents_status_idx" ON "topper_documents" ("status");
CREATE INDEX IF NOT EXISTS "topper_document_pages_document_id_idx" ON "topper_document_pages" ("document_id");
CREATE INDEX IF NOT EXISTS "topper_answers_paper_group_idx" ON "topper_answers" ("paper_group");
CREATE INDEX IF NOT EXISTS "topper_answers_topic_idx" ON "topper_answers" ("topic");
CREATE INDEX IF NOT EXISTS "topper_answers_directive_idx" ON "topper_answers" ("directive");
CREATE INDEX IF NOT EXISTS "topper_answers_max_marks_idx" ON "topper_answers" ("max_marks");
CREATE INDEX IF NOT EXISTS "topper_answers_usable_for_rag_idx" ON "topper_answers" ("usable_for_rag");
CREATE INDEX IF NOT EXISTS "topper_answer_embeddings_answer_id_idx" ON "topper_answer_embeddings" ("answer_id");
CREATE INDEX IF NOT EXISTS "topper_answer_embeddings_embedding_idx"
  ON "topper_answer_embeddings" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "mains_evaluations"
  ADD COLUMN IF NOT EXISTS "demand_coverage" JSONB,
  ADD COLUMN IF NOT EXISTS "section_feedback" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer" TEXT,
  ADD COLUMN IF NOT EXISTS "annotation_plan" JSONB,
  ADD COLUMN IF NOT EXISTS "checked_copy_url" TEXT,
  ADD COLUMN IF NOT EXISTS "checked_copy_status" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation_mode" TEXT;

ALTER TABLE "pyq_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "demand_coverage" JSONB,
  ADD COLUMN IF NOT EXISTS "section_feedback" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer" TEXT,
  ADD COLUMN IF NOT EXISTS "annotation_plan" JSONB,
  ADD COLUMN IF NOT EXISTS "checked_copy_url" TEXT,
  ADD COLUMN IF NOT EXISTS "checked_copy_status" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation_mode" TEXT;

ALTER TABLE "mock_test_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "demand_coverage" JSONB,
  ADD COLUMN IF NOT EXISTS "section_feedback" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer" TEXT,
  ADD COLUMN IF NOT EXISTS "annotation_plan" JSONB,
  ADD COLUMN IF NOT EXISTS "checked_copy_url" TEXT,
  ADD COLUMN IF NOT EXISTS "checked_copy_status" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation_mode" TEXT;

CREATE OR REPLACE FUNCTION match_topper_answers(
  query_embedding vector(1536),
  match_count int DEFAULT 8,
  paper_group_filter text DEFAULT NULL,
  max_marks_filter int DEFAULT NULL,
  directive_filter text DEFAULT NULL,
  topic_filter text DEFAULT NULL
)
RETURNS TABLE (
  answer_id text,
  chunk_id text,
  chunk_type text,
  chunk_text text,
  question_text text,
  paper_group text,
  subject text,
  topic text,
  directive text,
  max_marks int,
  awarded_marks double precision,
  score_band text,
  quality_status text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id AS answer_id,
    e.id AS chunk_id,
    e.chunk_type,
    e.chunk_text,
    a.question_text,
    a.paper_group,
    a.subject,
    a.topic,
    a.directive,
    a.max_marks,
    a.awarded_marks,
    a.score_band,
    a.quality_status,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM "topper_answer_embeddings" e
  JOIN "topper_answers" a ON a.id = e.answer_id
  WHERE
    e.embedding IS NOT NULL
    AND a.usable_for_rag = TRUE
    AND a.quality_status IN ('gold', 'silver')
    AND (paper_group_filter IS NULL OR a.paper_group = paper_group_filter)
    AND (max_marks_filter IS NULL OR a.max_marks = max_marks_filter)
    AND (directive_filter IS NULL OR a.directive ILIKE directive_filter)
    AND (topic_filter IS NULL OR a.topic ILIKE topic_filter)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
