-- Add metrics JSON column to evaluation tables for AI-generated per-dimension scoring

-- AlterTable
ALTER TABLE "mains_evaluations" ADD COLUMN IF NOT EXISTS "metrics" JSONB;

-- AlterTable
ALTER TABLE "pyq_mains_evaluations" ADD COLUMN IF NOT EXISTS "metrics" JSONB;

-- AlterTable
ALTER TABLE "mock_test_mains_evaluations" ADD COLUMN IF NOT EXISTS "metrics" JSONB;
