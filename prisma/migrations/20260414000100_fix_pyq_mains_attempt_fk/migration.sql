-- Ensure mains attempts reference mains question table, not prelims
ALTER TABLE pyq_mains_attempts
ADD COLUMN IF NOT EXISTS pyq_mains_question_id TEXT;

-- Backfill from legacy column where possible
UPDATE pyq_mains_attempts
SET pyq_mains_question_id = pyq_question_id
WHERE pyq_mains_question_id IS NULL
  AND pyq_question_id IS NOT NULL;

-- Avoid FK violation for legacy rows that point to non-mains question ids
UPDATE pyq_mains_attempts a
SET pyq_mains_question_id = NULL
WHERE pyq_mains_question_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pyq_mains_questions q
    WHERE q.id = a.pyq_mains_question_id
  );

-- Add FK to mains questions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'pyq_mains_attempts_pyq_mains_question_id_fkey'
      AND table_name = 'pyq_mains_attempts'
  ) THEN
    ALTER TABLE pyq_mains_attempts
    ADD CONSTRAINT pyq_mains_attempts_pyq_mains_question_id_fkey
    FOREIGN KEY (pyq_mains_question_id)
    REFERENCES pyq_mains_questions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pyq_mains_attempts_user_id_pyq_mains_question_id_idx
  ON pyq_mains_attempts(user_id, pyq_mains_question_id);
