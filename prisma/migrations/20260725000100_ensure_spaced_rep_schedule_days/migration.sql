-- Production-safe repair for databases that were baselined before the
-- original multi-day spaced-repetition migration was applied.
ALTER TABLE "spaced_rep_items"
ADD COLUMN IF NOT EXISTS "schedule_days" JSONB;

-- Existing single-day items retain their original revision date as their only
-- scheduled review. New items may store several days, such as [3, 7, 15].
UPDATE "spaced_rep_items"
SET "schedule_days" = to_jsonb(ARRAY["schedule_day"])
WHERE "schedule_days" IS NULL;
