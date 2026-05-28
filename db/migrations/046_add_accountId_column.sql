-- Add quoted "accountId" column expected by Better Auth adapters
ALTER TABLE "account"
ADD COLUMN IF NOT EXISTS "accountId" TEXT;
