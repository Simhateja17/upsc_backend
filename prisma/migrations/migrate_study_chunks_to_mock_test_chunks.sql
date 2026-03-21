-- ============================================================
-- Migration: Move study_material data → mock_test tables
-- Run this once in Supabase SQL Editor
-- ============================================================

-- Step 1: Copy upload records from study_material_uploads → mock_test_material_uploads
INSERT INTO mock_test_material_uploads (
  id,
  file_name,
  file_url,
  subject,
  topic,
  source,
  status,
  total_chunks,
  uploaded_by_id,
  created_at
)
SELECT
  id,
  file_name,
  file_url,
  subject,
  topic,
  source,
  status,
  total_chunks,
  uploaded_by_id,
  created_at
FROM study_material_uploads
ON CONFLICT (id) DO NOTHING;

-- Step 2: Copy chunks from study_material_chunks → mock_test_chunks
INSERT INTO mock_test_chunks (
  id,
  upload_id,
  page_number,
  chunk_index,
  chunk_text,
  embedding,
  metadata,
  created_at
)
SELECT
  id,
  upload_id,
  page_number,
  chunk_index,
  chunk_text,
  embedding,
  metadata,
  created_at
FROM study_material_chunks
ON CONFLICT (id) DO NOTHING;

-- Step 3: Delete old chunks and uploads (now safely copied)
DELETE FROM study_material_chunks;
DELETE FROM study_material_uploads;

-- Verify
SELECT 'mock_test_material_uploads' AS table_name, COUNT(*) AS rows FROM mock_test_material_uploads
UNION ALL
SELECT 'mock_test_chunks',                          COUNT(*)           FROM mock_test_chunks
UNION ALL
SELECT 'study_material_uploads (should be 0)',      COUNT(*)           FROM study_material_uploads
UNION ALL
SELECT 'study_material_chunks (should be 0)',       COUNT(*)           FROM study_material_chunks;
