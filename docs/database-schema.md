# Database Schema Guide

## Purpose

This project uses **normal PostgreSQL with `pg`**, not Prisma.

Better Auth owns authentication tables. Custom SQL tables own dashboard business logic.

## Core Relationships

```txt
Better Auth "user" → profile
profile → user_brand_access → brand
profile → user_brand_access → role → role_permission → permission
```

## Better Auth Tables

Better Auth owns:

- `"user"`
- `"session"`
- `"account"`
- `"verification"`

Use Better Auth CLI or generated SQL to create these tables for PostgreSQL.

## Custom Tables

Create these custom tables:

- `profile`
- `brand`
- `role`
- `permission`
- `role_permission`
- `user_brand_access`
- `user_permission_override`
- `account_invite`
- `account_invite_brand_access`

Do not add `audit_log` in v1.

## Enum Strategy

Use `TEXT` columns with `CHECK` constraints for easier future changes.

### Account Types

```txt
CLIENT
EMPLOYEE
SUPERVISOR
MANAGER
EXECUTIVE
```

### Profile Status

```txt
ACTIVE
INVITED
DISABLED
SUSPENDED
ARCHIVED
```

### Override Effects

```txt
ALLOW
DENY
```

### Invite Status

```txt
PENDING
ACCEPTED
EXPIRED
CANCELLED
```

## SQL Schema

```sql
CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,
  auth_user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('CLIENT', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'EXECUTIVE')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  position TEXT,
  department TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED', 'SUSPENDED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_account_type ON profile(account_type);
CREATE INDEX IF NOT EXISTS idx_profile_status ON profile(status);

CREATE TABLE IF NOT EXISTS brand (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_is_active ON brand(is_active);

CREATE TABLE IF NOT EXISTS role (
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

CREATE INDEX IF NOT EXISTS idx_role_level ON role(level);
CREATE INDEX IF NOT EXISTS idx_role_is_active ON role(is_active);

CREATE TABLE IF NOT EXISTS permission (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_module ON permission(module);

CREATE TABLE IF NOT EXISTS role_permission (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT role_permission_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_brand_access (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_brand_access_unique UNIQUE (profile_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_brand_access_profile_id ON user_brand_access(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_access_brand_id ON user_brand_access(brand_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_access_is_active ON user_brand_access(is_active);

CREATE TABLE IF NOT EXISTS user_permission_override (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_permission_override_unique UNIQUE (profile_id, permission_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_override_profile_id ON user_permission_override(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_override_permission_id ON user_permission_override(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_override_brand_id ON user_permission_override(brand_id);

CREATE TABLE IF NOT EXISTS account_invite (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('CLIENT', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'EXECUTIVE')),
  invited_by INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_invite_email ON account_invite(email);
CREATE INDEX IF NOT EXISTS idx_account_invite_status ON account_invite(status);

CREATE TABLE IF NOT EXISTS account_invite_brand_access (
  id SERIAL PRIMARY KEY,
  account_invite_id INTEGER NOT NULL REFERENCES account_invite(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_invite_brand_access_unique UNIQUE (account_invite_id, brand_id)
);
```

## Important Rules

- Do not add `brand_id` to `profile`.
- Do not hard delete `user_brand_access`; set `is_active = false` and `revoked_at = now()`.
- Do not add a global unique index enforcing one primary brand for all account types.
- CLIENT and EMPLOYEE primary brand rules are enforced in server validation.
- SUPERVISOR, MANAGER, and EXECUTIVE are not blocked by multiple primary flags.

## Approval Publishing Proof

`content_report` stores publishing ownership and proof with nullable columns so
existing approval records remain valid:

- `publishing_proof_url`
- `publishing_proof_note`
- `publishing_proof_submitted_by_profile_id`
- `publishing_proof_submitted_at`
- `published_by_profile_id`
- `published_at`
- `scheduled_by_profile_id`
- `scheduled_at`

Requests must not move to `publish_status = 'Published'` without publishing
proof.
