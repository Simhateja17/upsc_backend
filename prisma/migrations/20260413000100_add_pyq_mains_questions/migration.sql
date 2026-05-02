ALTER TABLE pyq_uploads
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'prelims';

CREATE TABLE IF NOT EXISTS pyq_mains_questions (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  paper TEXT NOT NULL,
  question_text TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  source_file TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  upload_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pyq_mains_questions_upload_id_fkey
    FOREIGN KEY (upload_id) REFERENCES pyq_uploads(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS pyq_mains_questions_subject_status_idx
  ON pyq_mains_questions(subject, status);

CREATE INDEX IF NOT EXISTS pyq_mains_questions_year_paper_idx
  ON pyq_mains_questions(year, paper);
