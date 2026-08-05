ALTER TABLE "pricing_plans"
ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'rise',
ADD COLUMN IF NOT EXISTS "billing_cycle" TEXT NOT NULL DEFAULT 'quarterly',
ADD COLUMN IF NOT EXISTS "original_price" INTEGER,
ADD COLUMN IF NOT EXISTS "entitlements" JSONB;

UPDATE "pricing_plans"
SET "tier" = CASE
  WHEN LOWER("name") LIKE '%ascent%' OR LOWER("name") LIKE '%premium%' THEN 'ascent'
  WHEN LOWER("name") LIKE '%aspire%' OR LOWER("name") LIKE '%foundation%' THEN 'aspire'
  WHEN LOWER("name") LIKE '%rise%' OR LOWER("name") LIKE '%standard%' THEN 'rise'
  ELSE "tier"
END;

UPDATE "pricing_plans"
SET "billing_cycle" = CASE
  WHEN "duration_days" >= 360 THEN 'yearly'
  WHEN "duration_days" >= 80 THEN 'quarterly'
  WHEN "duration_days" >= 25 THEN 'monthly'
  ELSE "billing_cycle"
END;

CREATE INDEX IF NOT EXISTS "pricing_plans_tier_billing_cycle_is_active_idx"
ON "pricing_plans" ("tier", "billing_cycle", "is_active");

CREATE TABLE IF NOT EXISTS "usage_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "feature_key" TEXT NOT NULL,
  "source" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'success',
  "idempotency_key" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_events_idempotency_key_unique"
ON "usage_events" ("idempotency_key")
WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "usage_events_user_id_feature_key_created_at_idx"
ON "usage_events" ("user_id", "feature_key", "created_at");

CREATE INDEX IF NOT EXISTS "usage_events_feature_key_created_at_idx"
ON "usage_events" ("feature_key", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_events_user_id_fkey'
  ) THEN
    ALTER TABLE "usage_events"
    ADD CONSTRAINT "usage_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_entitlement_overrides" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_tier_override" TEXT,
  "extra_usage" JSONB,
  "reason" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_entitlement_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_entitlement_overrides_user_id_expires_at_idx"
ON "user_entitlement_overrides" ("user_id", "expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_entitlement_overrides_user_id_fkey'
  ) THEN
    ALTER TABLE "user_entitlement_overrides"
    ADD CONSTRAINT "user_entitlement_overrides_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
