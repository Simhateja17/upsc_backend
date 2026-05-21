ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "plan_id" TEXT;

UPDATE "orders"
SET "plan_id" = "item_id"
WHERE "plan_id" IS NULL
  AND "item_type" = 'plan'
  AND EXISTS (
    SELECT 1
    FROM "pricing_plans"
    WHERE "pricing_plans"."id" = "orders"."item_id"
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'plan_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1
    FROM "orders"
    WHERE "plan_id" IS NULL
  ) THEN
    ALTER TABLE "orders" ALTER COLUMN "plan_id" SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_plan_id_fkey'
  ) THEN
    ALTER TABLE "orders"
    ADD CONSTRAINT "orders_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
