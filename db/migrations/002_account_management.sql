-- Account management business tables
-- Requires Better Auth tables to already exist:
-- "user", "session", "account", "verification"

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS set_profile_updated_at ON profile;

CREATE TRIGGER set_profile_updated_at
BEFORE UPDATE ON profile
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS brand (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_is_active
ON brand(is_active);

DROP TRIGGER IF EXISTS set_brand_updated_at ON brand;

CREATE TRIGGER set_brand_updated_at
BEFORE UPDATE ON brand
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "role" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_level
ON "role"(level);

CREATE INDEX IF NOT EXISTS idx_role_is_active
ON "role"(is_active);

DROP TRIGGER IF EXISTS set_role_updated_at ON "role";

CREATE TRIGGER set_role_updated_at
BEFORE UPDATE ON "role"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS permission (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_module
ON permission(module);

DROP TRIGGER IF EXISTS set_permission_updated_at ON permission;

CREATE TRIGGER set_permission_updated_at
BEFORE UPDATE ON permission
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS role_permission (
  id SERIAL PRIMARY KEY,

  role_id INTEGER NOT NULL
    REFERENCES "role"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  permission_id INTEGER NOT NULL
    REFERENCES permission(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT role_permission_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_brand_access (
  id SERIAL PRIMARY KEY,

  profile_id INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  brand_id INTEGER NOT NULL
    REFERENCES brand(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  role_id INTEGER NOT NULL
    REFERENCES "role"(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_brand_access_unique UNIQUE (profile_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_brand_access_profile_id
ON user_brand_access(profile_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_access_brand_id
ON user_brand_access(brand_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_access_role_id
ON user_brand_access(role_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_access_is_active
ON user_brand_access(is_active);

DROP TRIGGER IF EXISTS set_user_brand_access_updated_at ON user_brand_access;

CREATE TRIGGER set_user_brand_access_updated_at
BEFORE UPDATE ON user_brand_access
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_permission_override (
  id SERIAL PRIMARY KEY,

  profile_id INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  permission_id INTEGER NOT NULL
    REFERENCES permission(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  brand_id INTEGER
    REFERENCES brand(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  effect TEXT NOT NULL CHECK (
    effect IN ('ALLOW', 'DENY')
  ),

  reason TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_permission_override_unique
  UNIQUE (profile_id, permission_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_override_profile_id
ON user_permission_override(profile_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_override_permission_id
ON user_permission_override(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_override_brand_id
ON user_permission_override(brand_id);

DROP TRIGGER IF EXISTS set_user_permission_override_updated_at ON user_permission_override;

CREATE TRIGGER set_user_permission_override_updated_at
BEFORE UPDATE ON user_permission_override
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS account_invite (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,

  token_hash TEXT NOT NULL UNIQUE,

  account_type TEXT NOT NULL CHECK (
    account_type IN (
      'CLIENT',
      'EMPLOYEE',
      'SUPERVISOR',
      'MANAGER',
      'EXECUTIVE'
    )
  ),

  invited_by INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN (
      'PENDING',
      'ACCEPTED',
      'EXPIRED',
      'CANCELLED'
    )
  ),

  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_invite_email
ON account_invite(email);

CREATE INDEX IF NOT EXISTS idx_account_invite_status
ON account_invite(status);

DROP TRIGGER IF EXISTS set_account_invite_updated_at ON account_invite;

CREATE TRIGGER set_account_invite_updated_at
BEFORE UPDATE ON account_invite
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS account_invite_brand_access (
  id SERIAL PRIMARY KEY,

  account_invite_id INTEGER NOT NULL
    REFERENCES account_invite(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  brand_id INTEGER NOT NULL
    REFERENCES brand(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  role_id INTEGER NOT NULL
    REFERENCES "role"(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT account_invite_brand_access_unique
  UNIQUE (account_invite_id, brand_id)
);

DROP TRIGGER IF EXISTS set_account_invite_brand_access_updated_at ON account_invite_brand_access;

CREATE TRIGGER set_account_invite_brand_access_updated_at
BEFORE UPDATE ON account_invite_brand_access
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();