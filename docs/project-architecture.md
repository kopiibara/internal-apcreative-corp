# Project Architecture Guide

## Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- `pg`
- Better Auth
- shadcn/ui
- Tailwind CSS
- Zustand
- Sonner
- Zod

Prisma is not used.

## Recommended Structure

```txt
app/
  login/
  admin/
  employee/
  api/auth/[...all]/

components/
  layout/
  admin/accounts/
  ui/

db/
  migrations/

lib/
  auth.ts
  auth-client.ts
  auth-session.ts
  db.ts
  permissions.ts

scripts/
  migrate.ts
  seed.ts

stores/
  use-account-store.ts

types/
  auth.ts
  sidebar.ts
```

## Database Layer

Use `lib/db.ts`.

It should export:

- `pool`
- `query(text, params)`
- `transaction(callback)`

Use parameterized SQL only.

## Authentication Layer

Files:

- `lib/auth.ts`
- `lib/auth-client.ts`
- `app/api/auth/[...all]/route.ts`

Better Auth should use a PostgreSQL `Pool`.

## Route Rules

```txt
/login → login page
/ → session redirect

CLIENT, EMPLOYEE → /employee/dashboard
SUPERVISOR, MANAGER, EXECUTIVE → /admin/dashboard
```

## Server Authorization Layer

Files:

- `lib/auth-session.ts`
- `lib/permissions.ts`

These load the Better Auth session, profile, permissions, and brand access using SQL.

## Account UI

Use component-based structure:

```txt
app/admin/account-control/
  page.tsx
  actions.ts
  schema.ts

components/admin/accounts/
  account-table.tsx
  account-form-dialog.tsx
  account-brand-access.tsx
  account-role-select.tsx
  account-status-menu.tsx
```

## Zustand

Zustand is only for UI state. Never use it as a security source.

## Removed Prisma Files

Do not use:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `lib/prisma.ts`
- `lib/generated/prisma`
