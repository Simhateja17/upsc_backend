-- Create mock_test_material_uploads table
CREATE TABLE IF NOT EXISTS "mock_test_material_uploads" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "file_name"     TEXT NOT NULL,
  "file_url"      TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "topic"         TEXT,
  "source"        TEXT,
  "status"        TEXT NOT NULL DEFAULT 'processing',
  "total_chunks"  INT  NOT NULL DEFAULT 0,
  "uploaded_by_id" TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mock_test_material_uploads_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "mock_test_material_uploads_subject_idx"
  ON "mock_test_material_uploads" ("subject");

-- Create mock_test_chunks table with vector column
CREATE TABLE IF NOT EXISTS "mock_test_chunks" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "upload_id"    TEXT NOT NULL,
  "page_number"  INT  NOT NULL,
  "chunk_index"  INT  NOT NULL,
  "chunk_text"   TEXT NOT NULL,
  "embedding"    vector(1536),
  "metadata"     JSONB NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mock_test_chunks_upload_id_fkey"
    FOREIGN KEY ("upload_id") REFERENCES "mock_test_material_uploads"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "mock_test_chunks_upload_id_idx"
  ON "mock_test_chunks" ("upload_id");

-- HNSW vector index for fast similarity search
CREATE INDEX IF NOT EXISTS "mock_test_chunks_embedding_idx"
  ON "mock_test_chunks" USING hnsw (embedding vector_cosine_ops);
