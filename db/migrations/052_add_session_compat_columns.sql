-- Better Auth session table compatibility columns (camelCase)
ALTER TABLE session
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION sync_session_columns_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW."userId" = COALESCE(NEW."userId", NEW.user_id);
  NEW.user_id = COALESCE(NEW.user_id, NEW."userId");

  NEW."expiresAt" = COALESCE(NEW."expiresAt", NEW.expires_at);
  NEW.expires_at = COALESCE(NEW.expires_at, NEW."expiresAt");

  NEW."createdAt" = COALESCE(NEW."createdAt", NEW.created_at, now());
  NEW.created_at = COALESCE(NEW.created_at, NEW."createdAt", now());

  NEW."updatedAt" = now();
  NEW.updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_session_columns ON session;
CREATE TRIGGER trg_sync_session_columns
BEFORE INSERT OR UPDATE ON session
FOR EACH ROW
EXECUTE FUNCTION sync_session_columns_trigger();

CREATE INDEX IF NOT EXISTS idx_session_userId ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_expiresAt ON session("expiresAt");
