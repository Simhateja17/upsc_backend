import prisma from "../src/config/database";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "mood_check_ins" (
      "id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "mood" TEXT NOT NULL,
      "energy" INTEGER NOT NULL,
      "note" TEXT,
      "date" DATE NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mood_check_ins_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "mood_check_ins_user_id_date_idx" ON "mood_check_ins"("user_id", "date");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "wellness_streaks" (
      "id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "current_streak" INTEGER NOT NULL DEFAULT 0,
      "longest_streak" INTEGER NOT NULL DEFAULT 0,
      "last_check_in" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "wellness_streaks_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "wellness_streaks_user_id_key" UNIQUE ("user_id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "mind_tool_sessions" (
      "id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "tool_type" TEXT NOT NULL,
      "duration" INTEGER NOT NULL,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mind_tool_sessions_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "mind_tool_sessions_user_id_tool_type_idx" ON "mind_tool_sessions"("user_id", "tool_type");
  `);

  console.log("Mental health tables created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
