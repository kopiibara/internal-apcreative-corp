-- Better Auth session metadata compatibility columns
ALTER TABLE session
ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
