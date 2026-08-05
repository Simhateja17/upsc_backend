-- Adds a per-question marks column to mock_test_questions so Mains mock
-- tests (in particular the Full Length pattern) can store a realistic
-- 10/15-mark split instead of dividing total marks evenly across questions.
-- Nullable and additive: existing rows are unaffected.
ALTER TABLE "mock_test_questions" ADD COLUMN "marks" INTEGER;
