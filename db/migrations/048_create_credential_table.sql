-- Create credential table for Better Auth email/password storage
CREATE TABLE IF NOT EXISTS credential (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  hashed_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credential_identifier_type ON credential(identifier, type);
CREATE INDEX IF NOT EXISTS idx_credential_user_id ON credential(user_id);

CREATE OR REPLACE FUNCTION set_credential_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_credential_updated_at ON credential;
CREATE TRIGGER set_credential_updated_at
BEFORE UPDATE ON credential
FOR EACH ROW
EXECUTE FUNCTION set_credential_updated_at();
