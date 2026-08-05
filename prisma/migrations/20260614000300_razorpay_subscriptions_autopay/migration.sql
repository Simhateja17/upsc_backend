BEGIN;

ALTER TABLE "pricing_plans"
  ADD COLUMN IF NOT EXISTS "razorpay_plan_id" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpay_plan_verified_at" TIMESTAMP(3);

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "razorpay_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpay_plan_id" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpay_status" TEXT,
  ADD COLUMN IF NOT EXISTS "current_start" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "current_end" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "charge_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "grace_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "superseded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "superseded_by_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resumed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_razorpay_subscription_id_key"
  ON "subscriptions" ("razorpay_subscription_id")
  WHERE "razorpay_subscription_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "subscriptions_razorpay_subscription_id_idx"
  ON "subscriptions" ("razorpay_subscription_id");

CREATE INDEX IF NOT EXISTS "subscriptions_razorpay_status_idx"
  ON "subscriptions" ("razorpay_status");

CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "entity" TEXT,
  "entity_id" TEXT,
  "payload" JSONB NOT NULL,
  "processing_status" TEXT NOT NULL DEFAULT 'pending',
  "processed_at" TIMESTAMP(3),
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "razorpay_webhook_events_event_id_key"
  ON "razorpay_webhook_events" ("event_id");

CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_event_type_created_at_idx"
  ON "razorpay_webhook_events" ("event_type", "created_at");

CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_processing_status_created_at_idx"
  ON "razorpay_webhook_events" ("processing_status", "created_at");

CREATE TABLE IF NOT EXISTS "subscription_coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "razorpay_offer_id" TEXT NOT NULL,
  "discount_label" TEXT,
  "max_redemptions" INTEGER,
  "max_redemptions_per_user" INTEGER,
  "redeemed_count" INTEGER NOT NULL DEFAULT 0,
  "valid_from" TIMESTAMP(3),
  "valid_until" TIMESTAMP(3),
  "allowed_tiers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowed_billing_cycles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_coupons_code_key"
  ON "subscription_coupons" ("code");

CREATE INDEX IF NOT EXISTS "subscription_coupons_code_is_active_idx"
  ON "subscription_coupons" ("code", "is_active");

CREATE TABLE IF NOT EXISTS "subscription_coupon_redemptions" (
  "id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "redeemed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_coupon_redemptions_user_id_status_idx"
  ON "subscription_coupon_redemptions" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "subscription_coupon_redemptions_subscription_id_status_idx"
  ON "subscription_coupon_redemptions" ("subscription_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_coupon_redemptions_coupon_id_subscription_id_key"
  ON "subscription_coupon_redemptions" ("coupon_id", "subscription_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_coupon_redemptions_coupon_id_fkey'
  ) THEN
    ALTER TABLE "subscription_coupon_redemptions"
      ADD CONSTRAINT "subscription_coupon_redemptions_coupon_id_fkey"
      FOREIGN KEY ("coupon_id") REFERENCES "subscription_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_coupon_redemptions_user_id_fkey'
  ) THEN
    ALTER TABLE "subscription_coupon_redemptions"
      ADD CONSTRAINT "subscription_coupon_redemptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_coupon_redemptions_subscription_id_fkey'
  ) THEN
    ALTER TABLE "subscription_coupon_redemptions"
      ADD CONSTRAINT "subscription_coupon_redemptions_subscription_id_fkey"
      FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_coupon_redemptions_payment_id_fkey'
  ) THEN
    ALTER TABLE "subscription_coupon_redemptions"
      ADD CONSTRAINT "subscription_coupon_redemptions_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
