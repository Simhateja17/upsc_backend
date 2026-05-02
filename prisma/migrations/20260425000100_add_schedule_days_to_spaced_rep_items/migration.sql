-- Add multi-day revision support for spaced repetition items.
ALTER TABLE "spaced_rep_items"
ADD COLUMN "schedule_days" JSONB;

UPDATE "spaced_rep_items"
SET "schedule_days" = to_jsonb(ARRAY["schedule_day"])
WHERE "schedule_days" IS NULL;
