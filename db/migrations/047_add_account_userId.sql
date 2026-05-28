-- Add quoted "userId" column to `account` to satisfy Better Auth adapter
ALTER TABLE account
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Backfill existing rows from snake_case `user_id` if present
UPDATE account
SET "userId" = user_id::text
WHERE "userId" IS NULL AND user_id IS NOT NULL;

-- Keep them in sync for future writes
CREATE OR REPLACE FUNCTION sync_account_userid_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW."userId" = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_account_userid ON account;
CREATE TRIGGER trg_sync_account_userid
BEFORE INSERT OR UPDATE ON account
FOR EACH ROW
EXECUTE FUNCTION sync_account_userid_trigger();

CREATE INDEX IF NOT EXISTS idx_account_userId ON account("userId");
