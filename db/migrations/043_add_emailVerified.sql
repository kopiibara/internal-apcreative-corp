-- Add quoted "emailVerified" column expected by Better Auth adapters
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
