ALTER TABLE pyq_mains_question_bank
  ADD COLUMN IF NOT EXISTS taxonomy_l1 TEXT,
  ADD COLUMN IF NOT EXISTS taxonomy_l2 TEXT,
  ADD COLUMN IF NOT EXISTS taxonomy_l3 TEXT;

UPDATE pyq_mains_question_bank
SET
  taxonomy_l1 = subject,
  taxonomy_l2 = CASE
    WHEN paper = 'GS-I' THEN COALESCE(NULLIF(sub_subject, ''), NULLIF(theme, ''))
    ELSE COALESCE(NULLIF(theme, ''), NULLIF(sub_subject, ''))
  END,
  taxonomy_l3 = CASE
    WHEN paper = 'GS-I' THEN NULLIF(theme, '')
    ELSE NULLIF(topic, '')
  END
WHERE taxonomy_l1 IS NULL
   OR taxonomy_l2 IS NULL
   OR taxonomy_l3 IS NULL;

ALTER TABLE pyq_mains_question_bank
  ALTER COLUMN taxonomy_l1 SET NOT NULL;

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_taxonomy_l1_idx
  ON pyq_mains_question_bank(taxonomy_l1);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_taxonomy_l2_idx
  ON pyq_mains_question_bank(taxonomy_l2);

CREATE INDEX IF NOT EXISTS pyq_mains_question_bank_taxonomy_l3_idx
  ON pyq_mains_question_bank(taxonomy_l3);
