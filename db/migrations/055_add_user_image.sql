-- Add user avatar/image column used by app profile joins and avatar features
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS image TEXT;
