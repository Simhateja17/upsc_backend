-- Legacy column `pyq_question_id` on pyq_mains_attempts pointed at the
-- prelims table; the current schema uses `pyq_mains_question_id` instead.
-- Prisma no longer writes to it, so its NOT NULL constraint blocks every
-- new insert. Drop the constraint so new mains attempts can be created.
ALTER TABLE pyq_mains_attempts
  ALTER COLUMN pyq_question_id DROP NOT NULL;
