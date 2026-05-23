-- Topic-level library materials backed by syllabus taxonomy.
ALTER TABLE "study_materials"
  ADD COLUMN IF NOT EXISTS "syllabus_sub_topic_id" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "access_level" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "study_materials"
  ALTER COLUMN "chapter_id" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_materials_syllabus_sub_topic_id_fkey'
  ) THEN
    ALTER TABLE "study_materials"
      ADD CONSTRAINT "study_materials_syllabus_sub_topic_id_fkey"
      FOREIGN KEY ("syllabus_sub_topic_id")
      REFERENCES "syllabus_sub_topics"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "study_materials_syllabus_sub_topic_id_idx"
  ON "study_materials"("syllabus_sub_topic_id");
