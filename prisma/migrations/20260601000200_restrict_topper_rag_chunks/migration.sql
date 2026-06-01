DELETE FROM "topper_answer_embeddings"
WHERE "chunk_type" NOT IN ('question', 'answer');

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
    AND e.chunk_type IN ('question', 'answer')
    AND a.usable_for_rag = TRUE
    AND a.quality_status IN ('gold', 'silver')
    AND (paper_group_filter IS NULL OR a.paper_group = paper_group_filter)
    AND (max_marks_filter IS NULL OR a.max_marks = max_marks_filter)
    AND (directive_filter IS NULL OR a.directive ILIKE directive_filter)
    AND (topic_filter IS NULL OR a.topic ILIKE topic_filter)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
