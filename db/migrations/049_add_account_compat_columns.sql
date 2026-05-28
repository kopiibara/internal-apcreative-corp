-- Better Auth account table compatibility columns (camelCase)
ALTER TABLE account
ADD COLUMN IF NOT EXISTS "providerId" TEXT,
ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT now();

-- Keep camelCase and snake_case columns in sync for the adapter and app code.
CREATE OR REPLACE FUNCTION sync_account_columns_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW."userId" = COALESCE(NEW."userId", NEW.user_id);
  NEW.user_id = COALESCE(NEW.user_id, NEW."userId");

  NEW."providerId" = COALESCE(NEW."providerId", NEW.provider);
  NEW.provider = COALESCE(NEW.provider, NEW."providerId");

  NEW."providerAccountId" = COALESCE(NEW."providerAccountId", NEW.provider_account_id);
  NEW.provider_account_id = COALESCE(NEW.provider_account_id, NEW."providerAccountId");

  NEW."createdAt" = COALESCE(NEW."createdAt", NEW.created_at, now());
  NEW.created_at = COALESCE(NEW.created_at, NEW."createdAt", now());

  NEW."updatedAt" = now();
  NEW.updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_account_columns ON account;
CREATE TRIGGER trg_sync_account_columns
BEFORE INSERT OR UPDATE ON account
FOR EACH ROW
EXECUTE FUNCTION sync_account_columns_trigger();

CREATE INDEX IF NOT EXISTS idx_account_providerId ON account("providerId");
CREATE INDEX IF NOT EXISTS idx_account_providerAccountId ON account("providerAccountId");
