# Do's and Don'ts

## Do

- Use Better Auth.
- Use cookie-based sessions.
- Use PostgreSQL through `pg`.
- Use SQL migrations.
- Use profile as the business account center.
- Use user_brand_access for brand assignments.
- Support multiple brands per account.
- Allow different role per brand.
- Use role_permission for reusable permissions.
- Use user_permission_override for special allow/deny cases.
- Use account_invite_brand_access for multi-brand invites.
- Use shadcn/ui.
- Use Sonner.
- Use Zustand only for UI state.
- Use Zod.
- Use server-side permission checks.
- Use parameterized SQL.
- Use transactions.

## Don't

- Do not use Prisma.
- Do not use Prisma Client.
- Do not use Prisma migrations.
- Do not store auth data in localStorage.
- Do not store permissions in Zustand as a security source.
- Do not put brand_id directly in profile.
- Do not assume one user has only one brand.
- Do not hard delete user_brand_access.
- Do not rely on frontend route hiding for security.
- Do not concatenate user input into SQL.
- Do not add audit_log in v1.
- Do not make account creation single-brand only.

## Primary Brand Rules

CLIENT and EMPLOYEE:

- must have at least one active brand assignment
- must have exactly one primary active brand

SUPERVISOR, MANAGER, EXECUTIVE:

- do not require primary brand
- do not block multiple is_primary values
- admin access must not depend on is_primary
