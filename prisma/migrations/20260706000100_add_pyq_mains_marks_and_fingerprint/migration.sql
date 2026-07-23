ALTER TABLE pyq_mains_question_bank
  ADD COLUMN IF NOT EXISTS marks INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS question_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_question_fingerprint_idx
  ON pyq_mains_question_bank(question_fingerprint);
