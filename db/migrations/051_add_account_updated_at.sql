-- Add snake_case updated_at to the account table for trigger compatibility
ALTER TABLE account
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
