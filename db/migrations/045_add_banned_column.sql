-- Add quoted "banned" column expected by Better Auth
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "banned" BOOLEAN DEFAULT false;
