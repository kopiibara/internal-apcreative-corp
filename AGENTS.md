# AGENTS.md

## Project Context

Internal AP Creative dashboard built with Next.js App Router, TypeScript, PostgreSQL, `pg`, Better Auth, shadcn/ui, Tailwind CSS, Zustand, Sonner, and Zod.

**Prisma is not used. Do not add Prisma, Prisma Client, Prisma Adapter, Prisma schema, or Prisma migrations unless the owner explicitly changes this decision again.**

## Required Reading

Before changing code, read:

- `docs/database-schema.md`
- `docs/project-architecture.md`
- `docs/project-flow.md`
- `docs/clean-code-standards.md`
- `docs/security-standards.md`
- `docs/dos-and-donts.md`
- `docs/migration-guide.md`
- `prompts/codex-split-prompts.md`

## Core Rules

### Database

Use normal PostgreSQL through `pg`.

Use `lib/db.ts` for the database pool, query helper, and transaction helper.

Do not use:

- Prisma
- Prisma Client
- Prisma Adapter
- `prisma/schema.prisma`
- `npx prisma migrate`
- `npx prisma generate`
- `npx prisma studio`

### Authentication

### Database Migration Rule

Every database table or schema change must be done through a SQL migration.

Do not manually create or alter tables directly in the database for normal development.

Use:

````txt
db/migrations/

Use Better Auth with PostgreSQL `Pool`.

Better Auth owns:

- `"user"`
- `"session"`
- `"account"`
- `"verification"`

Use cookie-based sessions only. Never store session, token, profile, account type, role, permissions, or brand access in localStorage.

### Authorization

Custom PostgreSQL tables own dashboard business logic:

```txt
Better Auth "user"
→ profile
→ user_brand_access
→ brand

profile
→ user_brand_access
→ role
→ role_permission
→ permission
````

`profile` is the center of dashboard business logic.

Do not put `brand_id` directly in `profile`.

### Account Types

```txt
CLIENT, EMPLOYEE → /employee/dashboard
SUPERVISOR, MANAGER, EXECUTIVE → /admin/dashboard
```

CLIENT and EMPLOYEE use brand/role/permission checks.

SUPERVISOR, MANAGER, and EXECUTIVE get all permissions when `profile.status = 'ACTIVE'`.

### Multi-Brand Access

All account types can have multiple brand assignments through `user_brand_access`.

CLIENT and EMPLOYEE:

- require at least one active brand assignment
- require exactly one primary active brand

SUPERVISOR, MANAGER, EXECUTIVE:

- brand assignment is optional
- primary brand is not required
- multiple primary flags should not block creation
- admin access must not depend on brand assignment

### Zustand

Zustand is only for UI state:

- selected account
- dialog states
- filters
- search query
- temporary form UI state

Never store auth/session/security data in Zustand.

### Server Actions

Every server action must:

1. Read Better Auth session server-side.
2. Load profile from PostgreSQL.
3. Check profile status.
4. Check required permission.
5. Validate input with Zod.
6. Use parameterized SQL.
7. Use transactions for multi-table writes.
8. Revalidate affected routes.
9. Return `{ success, message, data? }`.

### UI

Use shadcn/ui components when available. Do not add unnecessary custom colors.

### SQL Security

Always use parameterized SQL. Never concatenate user input into SQL.
