BEGIN;

ALTER TABLE "study_plan_tasks"
  ADD COLUMN IF NOT EXISTS "actual_duration" INTEGER;

COMMIT;
