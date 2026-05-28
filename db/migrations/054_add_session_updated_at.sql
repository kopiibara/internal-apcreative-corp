-- Add snake_case updated_at to the session table for trigger compatibility
ALTER TABLE session
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
