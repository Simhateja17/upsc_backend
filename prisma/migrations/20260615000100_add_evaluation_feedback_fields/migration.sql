ALTER TABLE "mains_evaluations"
  ADD COLUMN IF NOT EXISTS "key_terms" JSONB,
  ADD COLUMN IF NOT EXISTS "next_attempt_focus" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluator_conclusion" TEXT,
  ADD COLUMN IF NOT EXISTS "model_answer_key_points" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer_content" TEXT,
  ADD COLUMN IF NOT EXISTS "parameter_scores" JSONB;

ALTER TABLE "pyq_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "key_terms" JSONB,
  ADD COLUMN IF NOT EXISTS "next_attempt_focus" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluator_conclusion" TEXT,
  ADD COLUMN IF NOT EXISTS "model_answer_key_points" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer_content" TEXT,
  ADD COLUMN IF NOT EXISTS "parameter_scores" JSONB;

ALTER TABLE "mock_test_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "key_terms" JSONB,
  ADD COLUMN IF NOT EXISTS "next_attempt_focus" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluator_conclusion" TEXT,
  ADD COLUMN IF NOT EXISTS "model_answer_key_points" JSONB,
  ADD COLUMN IF NOT EXISTS "model_answer_content" TEXT,
  ADD COLUMN IF NOT EXISTS "parameter_scores" JSONB;
