# Security Standards

## Authentication

Use Better Auth cookie-based sessions only.

Never store in localStorage:

- session
- token
- profile
- account type
- role
- permissions
- brand access

## SQL Security

Use parameterized SQL for all queries.

Never concatenate user input into SQL.

Use transactions for multi-step writes.

## Authorization

Every protected server component, page, and server action must check:

- session
- profile
- profile status
- account type
- permission
- brand access when needed

Hiding UI is not security.

## Account Access

Admin-side account types:

- SUPERVISOR
- MANAGER
- EXECUTIVE

Employee-side account types:

- CLIENT
- EMPLOYEE

Only ACTIVE profiles can access dashboards.

Blocked statuses:

- INVITED
- DISABLED
- SUSPENDED
- ARCHIVED

## Permission Order

1. Load Better Auth session.
2. Load profile.
3. Deny if profile is not ACTIVE.
4. Admin-side account types allow all.
5. CLIENT/EMPLOYEE check brand access.
6. Non-expired DENY override wins.
7. Non-expired ALLOW override grants.
8. role_permission grants.
9. Otherwise deny.

## Data Safety

Do not hard delete important access records.

Disable profile with:

```sql
UPDATE profile SET status = 'DISABLED', updated_at = now() WHERE id = $1;
```

Revoke brand access with:

```sql
UPDATE user_brand_access
SET is_active = false,
    revoked_at = now(),
    updated_at = now()
WHERE id = $1;
```

## Orphaned Auth User Prevention

If Better Auth user creation succeeds but custom SQL writes fail:

- delete the Better Auth user if supported, or
- disable the auth user
- do not leave a usable auth user without a profile

## Server Action / API Route Checklist

Every mutation server action and sensitive API route must:

1. Require authentication (Better Auth session) unless intentionally public.
2. Load profile server-side and reject non-`ACTIVE` users.
3. Enforce permission keys and brand access for scoped data.
4. Validate input with Zod (IDs as positive integers, enums, lengths, dates).
5. Sanitize user-generated text before persistence when stored or rendered (`lib/security/sanitize-text.ts`).
6. Apply rate limiting via `enforceRateLimit` / `rejectIfRateLimited` (`lib/rate-limit.ts`, `lib/security/rate-limit-guards.ts`).
7. Use parameterized SQL only (`lib/db.ts`).
8. Return generic user-friendly errors; do not leak secrets, stack traces, or password values.
9. Write audit logs for sensitive account/task/approval actions without passwords, hashes, tokens, or API keys.

## Rate Limiting

Use PostgreSQL-backed buckets keyed by profile ID (fallback: IP).

Recommended bucket groups:

- `auth:*` — sign-in and password change
- `account:*` — account control mutations
- `task:*` / `reminder:*` — task and reminder mutations
- `brand-management` — brand CRUD
- `ads-campaign:*` — campaign CRUD and CSV import
- `daily-reports:fetch` — report data refresh

## Input Sanitization

Sanitize optional/required text fields (titles, notes, reasons, captions) server-side.

Never log or return:

- `DEFAULT_ACCOUNT_PASSWORD` / `DEFAULT_TEMPORARY_PASSWORD`
- password hashes
- session or auth tokens
- VAPID private keys or webhook secrets

## Public Routes

Intentionally public API routes must validate signatures or secrets and reject malformed input early.

## Component / File Organization

- Page files compose feature components; avoid monolithic UI + logic files.
- Review files at 250+ lines; split at 400+ when responsibilities are mixed.
- Keep SQL, permissions, and mutations server-side only.
