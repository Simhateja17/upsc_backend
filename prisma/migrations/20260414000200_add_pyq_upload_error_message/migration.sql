ALTER TABLE pyq_uploads
ADD COLUMN IF NOT EXISTS error_message TEXT;
