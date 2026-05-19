# Migration Guide

## Purpose

This project uses SQL migrations, not Prisma.

## Folder

```txt
db/migrations/
```

## Migration Runner

Use:

```txt
scripts/migrate.ts
```

Migration runner should:

1. Create `schema_migrations` if missing.
2. Read all `.sql` files.
3. Sort by filename.
4. Skip already-applied files.
5. Run each migration inside a transaction.
6. Insert filename into `schema_migrations` after success.

## Migration Tracking Table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Naming

Good:

```txt
001_better_auth.sql
002_account_management.sql
003_seed_roles_permissions.sql
```

Bad:

```txt
update.sql
fix.sql
changes.sql
```

## Better Auth Tables

Better Auth owns:

- `"user"`
- `"session"`
- `"account"`
- `"verification"`

Use Better Auth CLI to generate/migrate PostgreSQL auth tables, or place generated SQL in `db/migrations/001_better_auth.sql`.

## Custom Tables

Custom tables:

- profile
- brand
- role
- permission
- role_permission
- user_brand_access
- user_permission_override
- account_invite
- account_invite_brand_access

Do not add `audit_log` yet.

## Seed Rules

Seed must be idempotent.

Use `INSERT ... ON CONFLICT`.

Seed:

- initial EXECUTIVE Better Auth user
- initial ACTIVE profile
- brands
- roles
- permissions
- role permissions

## Validation

Before pushing:

- migrations run successfully
- seed runs successfully
- `npm run lint` passes
- `npm run build` passes
