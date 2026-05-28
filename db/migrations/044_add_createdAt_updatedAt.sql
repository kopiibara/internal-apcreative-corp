-- Add quoted "createdAt" and "updatedAt" columns expected by Better Auth
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT now();

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT now();
