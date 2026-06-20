BEGIN;

CREATE TABLE IF NOT EXISTS "user_hidden_flashcard_topics" (
  "id"        TEXT NOT NULL,
  "user_id"   TEXT NOT NULL,
  "deck_id"   TEXT NOT NULL,
  "topic_id"  TEXT NOT NULL,
  "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_hidden_flashcard_topics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_hidden_flashcard_topics_user_id_deck_id_topic_id_key"
  ON "user_hidden_flashcard_topics" ("user_id", "deck_id", "topic_id");

ALTER TABLE "user_hidden_flashcard_topics"
  ADD CONSTRAINT "user_hidden_flashcard_topics_deck_id_fkey"
  FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
