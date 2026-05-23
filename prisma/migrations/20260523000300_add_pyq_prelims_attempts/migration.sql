CREATE TABLE IF NOT EXISTS "pyq_prelims_attempts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "pyq_question_id" TEXT NOT NULL,
  "selected_option" TEXT,
  "correct_option" TEXT,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pyq_prelims_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pyq_prelims_attempts_user_id_pyq_question_id_key"
  ON "pyq_prelims_attempts"("user_id", "pyq_question_id");

CREATE INDEX IF NOT EXISTS "pyq_prelims_attempts_user_id_created_at_idx"
  ON "pyq_prelims_attempts"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pyq_prelims_attempts_user_id_fkey'
      AND table_name = 'pyq_prelims_attempts'
  ) THEN
    ALTER TABLE "pyq_prelims_attempts"
    ADD CONSTRAINT "pyq_prelims_attempts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pyq_prelims_attempts_pyq_question_id_fkey'
      AND table_name = 'pyq_prelims_attempts'
  ) THEN
    ALTER TABLE "pyq_prelims_attempts"
    ADD CONSTRAINT "pyq_prelims_attempts_pyq_question_id_fkey"
    FOREIGN KEY ("pyq_question_id") REFERENCES "pyq_questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
