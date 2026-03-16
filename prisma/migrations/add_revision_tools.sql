-- Migration: add_revision_tools
-- Run this SQL in your Supabase SQL Editor to create the flashcard, spaced repetition, and mindmap tables.

-- ─────────────────────────────────────────────
-- FLASHCARDS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "flashcard_decks" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "subject"    TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "icon"       TEXT NOT NULL DEFAULT '📚',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flashcard_decks_subject_id_key" UNIQUE ("subject_id")
);

CREATE TABLE IF NOT EXISTS "flashcards" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "deck_id"    TEXT NOT NULL,
    "topic"      TEXT NOT NULL,
    "topic_id"   TEXT NOT NULL,
    "question"   TEXT NOT NULL,
    "answer"     TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flashcards_deck_id_fkey"
        FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "flashcards_deck_id_topic_id_idx"
    ON "flashcards"("deck_id", "topic_id");

CREATE TABLE IF NOT EXISTS "user_flashcard_progress" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"   TEXT NOT NULL,
    "card_id"   TEXT NOT NULL,
    "mastered"  BOOLEAN NOT NULL DEFAULT false,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_flashcard_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_flashcard_progress_user_id_card_id_key" UNIQUE ("user_id", "card_id"),
    CONSTRAINT "user_flashcard_progress_card_id_fkey"
        FOREIGN KEY ("card_id") REFERENCES "flashcards"("id") ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- SPACED REPETITION
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "spaced_rep_items" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"           TEXT NOT NULL,
    "question_text"     TEXT NOT NULL,
    "source"            TEXT NOT NULL,
    "source_type"       TEXT NOT NULL,
    "subject"           TEXT NOT NULL,
    "schedule_day"      INTEGER NOT NULL DEFAULT 3,
    "remind_enabled"    BOOLEAN NOT NULL DEFAULT false,
    "added_to_flashcard" BOOLEAN NOT NULL DEFAULT false,
    "next_review_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spaced_rep_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "spaced_rep_items_user_id_next_review_at_idx"
    ON "spaced_rep_items"("user_id", "next_review_at");

-- ─────────────────────────────────────────────
-- MINDMAP
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "mindmap_subjects" (
    "id"   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🗺️',

    CONSTRAINT "mindmap_subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mindmap_subjects_slug_key" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "mindmaps" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "subject_id" TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "branches"   JSONB NOT NULL,
    "nodes"      JSONB NOT NULL,
    "quiz_data"  JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mindmaps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mindmaps_subject_id_slug_key" UNIQUE ("subject_id", "slug"),
    CONSTRAINT "mindmaps_subject_id_fkey"
        FOREIGN KEY ("subject_id") REFERENCES "mindmap_subjects"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_mindmap_progress" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"     TEXT NOT NULL,
    "mindmap_id"  TEXT NOT NULL,
    "viewed"      BOOLEAN NOT NULL DEFAULT false,
    "mastery"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_mindmap_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_mindmap_progress_user_id_mindmap_id_key" UNIQUE ("user_id", "mindmap_id"),
    CONSTRAINT "user_mindmap_progress_mindmap_id_fkey"
        FOREIGN KEY ("mindmap_id") REFERENCES "mindmaps"("id") ON DELETE CASCADE
);
