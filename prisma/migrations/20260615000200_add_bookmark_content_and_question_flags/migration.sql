-- AlterTable
ALTER TABLE "bookmarks" ADD COLUMN IF NOT EXISTS "content" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "question_flags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "question_flags_user_id_question_type_question_id_key" ON "question_flags"("user_id", "question_type", "question_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_flags_status_idx" ON "question_flags"("status");

-- AddForeignKey
ALTER TABLE "question_flags" ADD CONSTRAINT "question_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
