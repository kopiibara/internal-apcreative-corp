# Project Flow Guide

## Login Flow

```txt
/login
→ Better Auth validates credentials
→ Better Auth creates cookie session
→ server loads profile by auth_user_id
→ checks profile.status
→ redirects by account_type
```

Redirects:

```txt
CLIENT, EMPLOYEE → /employee/dashboard
SUPERVISOR, MANAGER, EXECUTIVE → /admin/dashboard
```

## Root Redirect Flow

```txt
/
→ check Better Auth session
→ no session: /login
→ session exists: load profile
→ inactive profile: blocked/login
→ active profile: redirect by account_type
```

## Account Creation Flow

```txt
Admin opens /admin/accounts
→ accounts.view check
→ Create Account dialog
→ form includes multiple brand assignments
→ createAccount server action
→ accounts.create check
→ Zod validation
→ Better Auth creates user
→ SQL transaction creates profile
→ SQL transaction creates user_brand_access rows
→ Sonner success
```

## Account Creation Validation

CLIENT and EMPLOYEE:

- at least one active brand assignment
- exactly one primary active brand
- multiple brands allowed
- different role per brand allowed

SUPERVISOR, MANAGER, EXECUTIVE:

- zero brand assignments allowed
- multiple brands allowed
- primary brand not required
- multiple primary flags do not block save

## Permission Flow

```txt
can(authUserId, permissionKey, brandId?)
→ load profile
→ deny if status is not ACTIVE
→ admin-side account type: allow all
→ employee-side account type: check user_brand_access, role_permission, overrides
```

Permission order:

1. expired overrides ignored
2. DENY wins
3. ALLOW grants
4. role_permission grants
5. otherwise deny

## Brand Access Revocation

Do not delete. Use:

```sql
UPDATE user_brand_access
SET is_active = false,
    revoked_at = now(),
    updated_at = now()
WHERE id = $1;
```

## Invite Flow

```txt
create account_invite
→ create account_invite_brand_access rows
→ accept invite
→ create/connect Better Auth user
→ create profile
→ convert invite brand rows to user_brand_access
```
