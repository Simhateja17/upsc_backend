-- Migration: add_chat_conversation_summaries
-- Stores compact rolling memory for Jeet AI Mentor so old chat turns do not need to
-- be resent verbatim on every model call.

ALTER TABLE "chat_conversations"
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "summarized_message_count" INTEGER NOT NULL DEFAULT 0;
