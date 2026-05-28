-- Better Auth account password compatibility column
ALTER TABLE account
ADD COLUMN IF NOT EXISTS "password" TEXT;
