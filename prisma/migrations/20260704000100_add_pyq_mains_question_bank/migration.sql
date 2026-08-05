CREATE TABLE IF NOT EXISTS pyq_mains_question_bank (
  id TEXT PRIMARY KEY,
  import_key TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  paper TEXT NOT NULL,
  question_num INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  model_answer TEXT,
  subject TEXT NOT NULL,
  sub_subject TEXT,
  theme TEXT,
  topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  structured_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_file TEXT,
  source_row INTEGER,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pyq_mains_question_bank ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_subject_status_idx
  ON pyq_mains_question_bank(subject, status);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_sub_subject_idx
  ON pyq_mains_question_bank(sub_subject);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_theme_idx
  ON pyq_mains_question_bank(theme);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_topic_idx
  ON pyq_mains_question_bank(topic);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_year_paper_idx
  ON pyq_mains_question_bank(year, paper);

ALTER TABLE pyq_mains_attempts
  ADD COLUMN IF NOT EXISTS pyq_mains_bank_question_id TEXT;

CREATE INDEX IF NOT EXISTS pyq_mains_attempts_user_bank_question_idx
  ON pyq_mains_attempts(user_id, pyq_mains_bank_question_id);

ALTER TABLE pyq_mains_attempts
  ADD CONSTRAINT pyq_mains_attempts_bank_question_id_fkey
  FOREIGN KEY (pyq_mains_bank_question_id)
  REFERENCES pyq_mains_question_bank(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
