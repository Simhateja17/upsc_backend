ALTER TABLE "study_plan_tasks"
  ADD COLUMN IF NOT EXISTS "google_calendar_event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "google_calendar_synced_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "google_calendar_sync_error" TEXT;

CREATE TABLE IF NOT EXISTS "calendar_sync_settings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'google',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "enabled_at" TIMESTAMP(3),
  "google_access_token_encrypted" TEXT,
  "google_refresh_token_encrypted" TEXT,
  "google_token_expires_at" TIMESTAMP(3),
  "google_scope" TEXT,
  "google_calendar_id" TEXT NOT NULL DEFAULT 'primary',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "last_sync_error" TEXT,
  "connected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "calendar_sync_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_sync_settings_user_id_key"
  ON "calendar_sync_settings"("user_id");

CREATE INDEX IF NOT EXISTS "calendar_sync_settings_provider_enabled_idx"
  ON "calendar_sync_settings"("provider", "enabled");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendar_sync_settings_user_id_fkey'
  ) THEN
    ALTER TABLE "calendar_sync_settings"
      ADD CONSTRAINT "calendar_sync_settings_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
