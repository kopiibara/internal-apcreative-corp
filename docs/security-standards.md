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
