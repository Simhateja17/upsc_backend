-- Single-device enforcement (last-login-wins).
-- active_session_id stores the Supabase auth session_id (JWT `session_id` claim)
-- that is currently allowed for this user. The auth middleware rejects any token
-- whose session_id differs (unless the user is an admin or enforcement is off).
-- active_session_meta holds display info for the Active Sessions panel.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_meta" JSONB;
