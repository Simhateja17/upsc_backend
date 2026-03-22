/**
 * Creates the revision tools tables directly via Prisma adapter (bypasses CLI).
 * Run with: npx tsx prisma/migrate-revision.ts
 */

import "dotenv/config";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔧 Creating revision tools tables...\n");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "flashcard_decks" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "subject"    TEXT NOT NULL,
      "subject_id" TEXT NOT NULL UNIQUE,
      "icon"       TEXT NOT NULL DEFAULT '📚',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("  ✓ flashcard_decks");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "flashcards" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "deck_id"    TEXT NOT NULL REFERENCES "flashcard_decks"("id") ON DELETE CASCADE,
      "topic"      TEXT NOT NULL,
      "topic_id"   TEXT NOT NULL,
      "question"   TEXT NOT NULL,
      "answer"     TEXT NOT NULL,
      "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "flashcards_deck_id_topic_id_idx" ON "flashcards"("deck_id", "topic_id");
  `);
  console.log("  ✓ flashcards");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_flashcard_progress" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "user_id"   TEXT NOT NULL,
      "card_id"   TEXT NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
      "mastered"  BOOLEAN NOT NULL DEFAULT false,
      "last_seen" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE("user_id", "card_id")
    );
  `);
  console.log("  ✓ user_flashcard_progress");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "spaced_rep_items" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "user_id"           TEXT NOT NULL,
      "question_text"     TEXT NOT NULL,
      "source"            TEXT NOT NULL,
      "source_type"       TEXT NOT NULL,
      "subject"           TEXT NOT NULL,
      "schedule_day"      INTEGER NOT NULL DEFAULT 3,
      "remind_enabled"    BOOLEAN NOT NULL DEFAULT false,
      "added_to_flashcard" BOOLEAN NOT NULL DEFAULT false,
      "next_review_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
      "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "spaced_rep_items_user_id_next_review_at_idx" ON "spaced_rep_items"("user_id", "next_review_at");
  `);
  console.log("  ✓ spaced_rep_items");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "mindmap_subjects" (
      "id"   TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "icon" TEXT NOT NULL DEFAULT '🗺️'
    );
  `);
  console.log("  ✓ mindmap_subjects");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "mindmaps" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "subject_id" TEXT NOT NULL REFERENCES "mindmap_subjects"("id") ON DELETE CASCADE,
      "title"      TEXT NOT NULL,
      "slug"       TEXT NOT NULL,
      "branches"   JSONB NOT NULL,
      "nodes"      JSONB NOT NULL,
      "quiz_data"  JSONB,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE("subject_id", "slug")
    );
  `);
  console.log("  ✓ mindmaps");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_mindmap_progress" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "user_id"    TEXT NOT NULL,
      "mindmap_id" TEXT NOT NULL REFERENCES "mindmaps"("id") ON DELETE CASCADE,
      "viewed"     BOOLEAN NOT NULL DEFAULT false,
      "mastery"    INTEGER NOT NULL DEFAULT 0,
      UNIQUE("user_id", "mindmap_id")
    );
  `);
  console.log("  ✓ user_mindmap_progress");

  console.log("\n✅ All tables created successfully!\n");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
