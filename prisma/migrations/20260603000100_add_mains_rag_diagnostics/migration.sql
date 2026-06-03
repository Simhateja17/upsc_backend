ALTER TABLE "mains_evaluations"
  ADD COLUMN IF NOT EXISTS "rag_diagnostics" JSONB;

ALTER TABLE "pyq_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "rag_diagnostics" JSONB;

ALTER TABLE "mock_test_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "rag_diagnostics" JSONB;
