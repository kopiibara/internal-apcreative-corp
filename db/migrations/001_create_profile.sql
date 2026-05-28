-- Create profile table for dashboard business account logic
-- Requires Better Auth "user" table to already exist.

CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,

  auth_user_id TEXT NOT NULL UNIQUE,

  account_type TEXT NOT NULL CHECK (
    account_type IN (
      'CLIENT',
      'EMPLOYEE',
      'SUPERVISOR',
      'MANAGER',
      'EXECUTIVE'
    )
  ),

  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,

  position TEXT,
  department TEXT,
  phone_number TEXT,

  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (
    status IN (
      'ACTIVE',
      'INVITED',
      'DISABLED',
      'SUSPENDED',
      'ARCHIVED'
    )
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_account_type
ON profile(account_type);

CREATE INDEX IF NOT EXISTS idx_profile_status
ON profile(status);

CREATE INDEX IF NOT EXISTS idx_profile_auth_user_id
ON profile(auth_user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profile_updated_at ON profile;

CREATE TRIGGER set_profile_updated_at
BEFORE UPDATE ON profile
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();