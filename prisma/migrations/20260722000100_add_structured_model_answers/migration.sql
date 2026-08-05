ALTER TABLE "mains_evaluations"
  ADD COLUMN IF NOT EXISTS "model_answer_structure" JSONB;

ALTER TABLE "pyq_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "model_answer_structure" JSONB;

ALTER TABLE "mock_test_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "model_answer_structure" JSONB;
