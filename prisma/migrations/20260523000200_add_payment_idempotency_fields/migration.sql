ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "provider_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_order_id_key"
  ON "payments"("provider_order_id")
  WHERE "provider_order_id" IS NOT NULL;
