ALTER TABLE profile
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS first_login_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profile_must_change_password
ON profile(must_change_password);