-- Fix: notifications.id had NO database-level default.
-- The Prisma model uses @default(uuid()) which only generates the id
-- client-side WHEN inserting via Prisma. All notification inserts go through
-- supabaseAdmin (raw Supabase client), which bypasses Prisma and never supplied
-- an id -> every insert failed the NOT NULL constraint and was silently caught.
-- Result: the notifications table had 0 rows despite crons + inline triggers.
--
-- This adds a DB-level default so raw inserts succeed, matching the original
-- add_notifications_table.sql intent. Safe, additive, reversible.
ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
