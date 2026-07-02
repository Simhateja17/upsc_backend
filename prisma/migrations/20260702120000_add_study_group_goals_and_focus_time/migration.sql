-- CreateTable
CREATE TABLE IF NOT EXISTS "study_group_goals" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "study_group_goal_completions" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_goal_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "study_group_member_daily" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "focus_seconds" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_group_member_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "study_group_goals_group_id_date_idx" ON "study_group_goals"("group_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "study_group_goal_completions_goal_id_user_id_key" ON "study_group_goal_completions"("goal_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "study_group_member_daily_group_id_user_id_date_key" ON "study_group_member_daily"("group_id", "user_id", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "study_group_member_daily_group_id_date_idx" ON "study_group_member_daily"("group_id", "date");

-- AddForeignKey
ALTER TABLE "study_group_goals" ADD CONSTRAINT "study_group_goals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_goals" ADD CONSTRAINT "study_group_goals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_goal_completions" ADD CONSTRAINT "study_group_goal_completions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "study_group_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_goal_completions" ADD CONSTRAINT "study_group_goal_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_member_daily" ADD CONSTRAINT "study_group_member_daily_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_member_daily" ADD CONSTRAINT "study_group_member_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
