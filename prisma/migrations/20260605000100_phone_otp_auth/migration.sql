-- Support Supabase phone-first auth users.
-- Phone users may not have an email address at account creation time.

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

DROP INDEX IF EXISTS "users_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique_not_null"
  ON "users" (LOWER("email"))
  WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique_not_null"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL;

CREATE OR REPLACE FUNCTION private.create_public_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    supabase_id,
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    role,
    is_active,
    email_verified,
    created_at
  ) VALUES (
    gen_random_uuid()::text,
    new.id::text,
    NULLIF(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName'),
    NULLIF(new.phone, ''),
    new.raw_user_meta_data->>'avatar_url',
    'user',
    true,
    new.email_confirmed_at IS NOT NULL,
    new.created_at::timestamp
  )
  ON CONFLICT (supabase_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.users.email),
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
        last_name = COALESCE(public.users.last_name, EXCLUDED.last_name),
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
        email_verified = EXCLUDED.email_verified;

  RETURN new;
END;
$function$;
