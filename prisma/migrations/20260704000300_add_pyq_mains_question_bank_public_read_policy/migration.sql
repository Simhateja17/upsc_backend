CREATE POLICY "Allow public read approved mains PYQ bank"
  ON pyq_mains_question_bank
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');
