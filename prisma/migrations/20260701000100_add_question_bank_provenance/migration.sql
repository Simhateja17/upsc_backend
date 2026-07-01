ALTER TABLE "mcq_questions"
  ADD COLUMN IF NOT EXISTS "source_question_bank_id" TEXT;

ALTER TABLE "mock_test_questions"
  ADD COLUMN IF NOT EXISTS "source_question_bank_id" TEXT;

CREATE INDEX IF NOT EXISTS "mcq_questions_source_question_bank_id_idx"
  ON "mcq_questions" ("source_question_bank_id");

CREATE INDEX IF NOT EXISTS "mock_test_questions_source_question_bank_id_idx"
  ON "mock_test_questions" ("source_question_bank_id");
