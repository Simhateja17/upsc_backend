-- Migration: add_chat_conversations
-- Run this SQL in your Supabase SQL Editor to create the chat tables.

CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"    TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_conversations_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversation_id" TEXT NOT NULL,
    "role"            TEXT NOT NULL,   -- 'user' | 'assistant'
    "content"         TEXT NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_messages_conversation_id_fkey"
        FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_created_at_idx"
    ON "chat_conversations"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx"
    ON "chat_messages"("conversation_id", "created_at");

-- Auto-update updated_at on chat_conversations
CREATE OR REPLACE FUNCTION update_chat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_conversations_updated_at ON "chat_conversations";
CREATE TRIGGER chat_conversations_updated_at
    BEFORE UPDATE ON "chat_conversations"
    FOR EACH ROW EXECUTE FUNCTION update_chat_conversations_updated_at();
