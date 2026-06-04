ALTER TABLE "mains_evaluations"
  ADD COLUMN IF NOT EXISTS "checked_copy_pages" JSONB;

ALTER TABLE "pyq_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "checked_copy_pages" JSONB;

ALTER TABLE "mock_test_mains_evaluations"
  ADD COLUMN IF NOT EXISTS "checked_copy_pages" JSONB;
