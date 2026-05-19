• Proposed Plan

# Better Auth + Prisma Account Management Plan

## Summary

Use Better Auth for cookie-based authentication and Prisma Profile for dashboard business logic.
Better Auth owns User, Session, Account, and Verification. Custom tables own account type, roles,
permissions, multi-brand access, permission overrides, and invites.

Core relationships:

Better Auth User -> Profile

Profile -> UserBrandAccess -> Brand

Profile -> UserBrandAccess -> Role -> RolePermission -> Permission

One Profile can have many UserBrandAccess records. Each brand assignment can have its own role.

AccountType decides which dashboard area the user can access. Role decides what the user can do per
brand.

## Core Decisions

- /login is the dedicated login page.
- / is a session-aware redirect page.
- Use Better Auth cookie-based sessions only.
- Do not store auth/session/profile/role/permission/brand data in localStorage.
- Remove mock localStorage auth from protected dashboard flows after Better Auth is connected.
- Zustand stores UI state only, never auth or permission security data.
- No AuditLog in this phase.
- Do not put brandId directly in Profile.
- Do not assume one user has only one brand.
- Account creation and invite creation must support multiple brand assignments from day one.

## Account Types

enum AccountType {
CLIENT
EMPLOYEE
SUPERVISOR
MANAGER
EXECUTIVE
}

Behavior:

- CLIENT, EMPLOYEE -> /employee/dashboard
- SUPERVISOR, MANAGER, EXECUTIVE -> /admin/dashboard
- CLIENT and EMPLOYEE use brand/role/permission checks.
- SUPERVISOR, MANAGER, and EXECUTIVE get all permissions by helper when Profile.status = ACTIVE,
  regardless of brand assignments.
- Still seed RolePermission for Supervisor, Manager, and Executive for UI, reporting, and future
  compatibility.

## Multi-Brand Access And Primary Brand Rules

UserBrandAccess is for all account types:

- CLIENT
- EMPLOYEE
- SUPERVISOR
- MANAGER
- EXECUTIVE

It must support:

- one Profile assigned to multiple Brand records
- one Profile having a different Role per Brand
- active/inactive brand access
- revoked brand access without deleting history
- optional isPrimary for default context/filtering

For CLIENT and EMPLOYEE:

- require at least one active brand assignment
- require exactly one primary active brand for default dashboard context
- allow multiple active brand assignments
- allow different role per brand
- permission checks run through Profile -> UserBrandAccess -> Role -> RolePermission -> Permission ->
  UserPermissionOverride

For SUPERVISOR, MANAGER, and EXECUTIVE:

- brand assignment is optional
- do not require a primary brand
- do not enforce exactly one primary brand
- if multiple brand assignments are submitted with isPrimary = true, do not block account creation
- either allow multiple primary flags as optional metadata or normalize by setting only the latest
  selected primary as true
- admin access must not depend on primary brand or UserBrandAccess
- all permissions come from AccountType when Profile.status = ACTIVE

Examples:

- Employee A:
  - Neon Nights = Brand Officer, primary
  - Al Qaysar = Content Creator
  - Pro Group = Ads Specialist
- Client A:
  - Al Qaysar = Client Viewer, primary
  - Pro Group = Client Viewer
- Manager A:
  - Neon Nights = Manager
  - Al Qaysar = Manager
  - Pro Group = Manager
- Executive A:
  - may have zero brand assignments and still access all admin data
  - may also have brand assignments for dashboard filtering or reporting ownership

## Files To Create

- lib/prisma.ts
- lib/auth.ts
- lib/auth-client.ts
- app/api/auth/[...all]/route.ts
- app/login/page.tsx
- types/auth.ts
- lib/auth-session.ts
- lib/permissions.ts
- app/admin/accounts/page.tsx
- app/admin/accounts/actions.ts
- app/admin/accounts/schema.ts
- components/admin/accounts/account-table.tsx
- components/admin/accounts/account-form-dialog.tsx
- components/admin/accounts/account-brand-access.tsx
- components/admin/accounts/account-role-select.tsx
- components/admin/accounts/account-status-menu.tsx
- stores/use-account-store.ts
- Optional: middleware.ts, only if Better Auth cookie detection is reliable.
- Optional: prisma/seed.ts

## Files To Update

- prisma/schema.prisma
- app/page.tsx
- components/auth/login-form.tsx
- components/layout/dashboard-shell.tsx
- components/layout/dashboard-sidebar.tsx
- types/sidebar.ts
- app/admin/layout.tsx
- app/employee/layout.tsx
- app/layout.tsx

## Package Plan

Already installed:

- better-auth
- @better-auth/prisma-adapter
- prisma
- @prisma/client
- @prisma/adapter-pg
- pg
- zod
- zustand

Install later:

- sonner

Add shadcn components later:

- select
- dialog
- table
- alert-dialog
- checkbox
- sonner

## Prisma Schema Plan

Better Auth models:

- User
- Session
- Account
- Verification

Custom models:

- Profile
- Brand
- Role
- Permission
- RolePermission
- UserBrandAccess
- UserPermissionOverride
- AccountInvite
- AccountInviteBrandAccess

Do not add AuditLog.

Profile:

- id
- authUserId @unique
- accountType
- fullName or displayName
- email
- position
- department
- phoneNumber
- status
- timestamps

Do not add brandId to Profile.

Brand:

- id
- name
- slug
- status or isActive
- timestamps

Role:

- id
- name
- slug
- description
- level
- isSystem
- isActive
- timestamps

Permission:

- id
- key
- module
- action
- description
- timestamps

RolePermission:

- roleId
- permissionId
- unique roleId + permissionId

UserBrandAccess:

- id
- profileId
- brandId
- roleId
- isPrimary
- isActive
- grantedAt
- revokedAt
- createdAt
- updatedAt
- unique profileId + brandId

Do not add a database constraint that enforces one primary brand globally, because admin-side account
types must not be blocked by multiple isPrimary values.

UserPermissionOverride:

- profileId
- permissionId
- optional brandId
- effect ALLOW | DENY
- optional reason
- optional expiresAt
- timestamps
- unique scoped override for profileId + permissionId + brandId
- if brandId is null, enforce global uniqueness in server actions; add partial DB unique index later
  if needed

AccountInvite:

- id
- email
- optional fullName
- token or tokenHash
- accountType
- invitedBy profileId
- status PENDING | ACCEPTED | EXPIRED | CANCELLED
- expiresAt
- acceptedAt
- createdAt
- updatedAt

AccountInviteBrandAccess:

- id
- accountInviteId
- brandId
- roleId
- isPrimary
- createdAt
- updatedAt
- unique accountInviteId + brandId

Purpose:

- Allows invite/account creation to include multiple initial brand assignments.
- After invite acceptance, convert each AccountInviteBrandAccess row into a UserBrandAccess row.
- Each invited brand can have its own role.
- Supports users who handle multiple brands on their first day.

## Seed Data

Seed one initial EXECUTIVE Better Auth user plus connected Profile.

Seed roles:

- Executive 100
- Manager 80
- Supervisor 60
- Brand Officer 40
- Ads Specialist 30
- Content Creator 20
- Employee 10
- Client Viewer, recommended for client brand access

Seed permissions:

- dashboard.view
- analytics.view
- analytics.export
- reports.view
- reports.create
- reports.update
- reports.delete
- reports.submit
- approvals.view
- approvals.approve
- approvals.reject
- approvals.request_revision
- accounts.view
- accounts.create
- accounts.update
- accounts.disable
- accounts.delete
- brands.view
- brands.create
- brands.update
- brands.delete
- permissions.view
- permissions.manage
- integrations.view
- integrations.manage
- ads.view
- staff.view

Role defaults:

- Executive, Manager, Supervisor: all permissions
- Brand Officer: dashboard, reports view/create/update/submit, analytics view
- Ads Specialist: dashboard, analytics view/export, reports view/create/submit, ads view
- Content Creator: dashboard, reports view/create/submit
- Employee: dashboard, reports view/create
- Client Viewer: dashboard, reports view, analytics view

## Account CRUD

/admin/accounts supports creating:

- CLIENT
- EMPLOYEE
- SUPERVISOR
- MANAGER
- EXECUTIVE

Create account form sections:

- basic account information
- accountType
- dynamic multi-brand assignment section
- position
- department
- phone number
- status

Brand assignment row fields:

- brandId
- roleId
- isPrimary
- isActive

Create account server action input:

brandAssignments: Array<{
brandId: number
roleId: number
isPrimary: boolean
}>

Create validation:

- CLIENT and EMPLOYEE must have brandAssignments.length >= 1.
- CLIENT and EMPLOYEE must have exactly one primary brand.
- SUPERVISOR, MANAGER, and EXECUTIVE can have zero brand assignments.
- SUPERVISOR, MANAGER, and EXECUTIVE do not require a primary brand.
- SUPERVISOR, MANAGER, and EXECUTIVE must not fail validation when more than one brand assignment has
  isPrimary = true.
- Prevent duplicate brandId in the same request.
- Each selected brand can have a different role.

Create behavior:

- Better Auth creates the login user.
- Prisma creates Profile.
- Prisma creates one UserBrandAccess row per selected brand assignment.
- For admin-side users, preserve submitted isPrimary values as optional metadata or normalize them so
  only the latest selected primary remains true.
- If Better Auth user creation succeeds but Prisma writes fail, delete or disable the auth user
  through Better Auth admin/server API.
- Do not leave a usable orphaned auth user.

Edit UI must support:

- adding brand access
- changing role per brand
- setting primary brand for CLIENT and EMPLOYEE
- optionally setting primary brand for admin-side users only if useful
- allowing multiple admin-side primary flags or normalizing them without blocking save
- revoking/deactivating brand access
- showing multiple assigned brands in the account table

Disable flow:

- Server action checks accounts.disable.
- Set Profile.status = DISABLED.
- Revoke sessions through Better Auth admin/server APIs.
- Avoid hard delete in v1 unless explicitly needed.

## Account Invite Plan

Invite creation must support multiple brand assignments, not one brand.

Invite validation:

- CLIENT and EMPLOYEE invites require at least one invite brand assignment.
- CLIENT and EMPLOYEE invites require exactly one primary brand.
- SUPERVISOR, MANAGER, and EXECUTIVE invites can have zero brand assignments.
- SUPERVISOR, MANAGER, and EXECUTIVE invites must not fail when more than one invite brand assignment
  has isPrimary = true.
- Duplicate invite brand assignments are rejected.

Invite acceptance:

- Create or connect the Better Auth user.
- Create Profile.
- Convert each AccountInviteBrandAccess row into one UserBrandAccess row.
- Preserve or normalize admin-side isPrimary values according to the same account creation rule.
- Preserve brandId, roleId, and isPrimary.
- Mark invite accepted.

## Permission Helper Plan

can() / hasPermission():

1. Load Profile by Better Auth authUserId.
2. If Profile.status !== ACTIVE, deny.
3. If account type is SUPERVISOR, MANAGER, or EXECUTIVE, allow all permissions regardless of brand
   assignments or primary brand values.
4. For CLIENT and EMPLOYEE, use scoped checks.
5. If brandId is provided, require active UserBrandAccess for that brand.
6. If no brandId is provided, check permission across any active UserBrandAccess.
7. For the relevant brand access row, check assigned Role.
8. Check RolePermission.
9. Apply UserPermissionOverride.
10. DENY wins.
11. ALLOW grants.
12. Expired overrides are ignored.
13. Otherwise deny.

## Route Protection

Routes:

- /login: login page
- /: session redirect

Root redirect:

- no session -> /login
- CLIENT or EMPLOYEE -> /employee/dashboard
- SUPERVISOR, MANAGER, EXECUTIVE -> /admin/dashboard

Allowed:

- /admin/\*: SUPERVISOR, MANAGER, EXECUTIVE
- /employee/\*: CLIENT, EMPLOYEE

Middleware:

- Optional only.
- Use only for obvious unauthenticated dashboard redirects if Better Auth cookie detection is
  reliable.
- Real protection stays in server layouts, pages, and actions.

## UI State And Components

Use:

- app/admin/accounts/page.tsx
- app/admin/accounts/actions.ts
- app/admin/accounts/schema.ts
- components/admin/accounts/account-table.tsx
- components/admin/accounts/account-form-dialog.tsx
- components/admin/accounts/account-brand-access.tsx
- components/admin/accounts/account-role-select.tsx
- components/admin/accounts/account-status-menu.tsx
- stores/use-account-store.ts

Dynamic multi-brand assignment UI:

- add brand assignment row
- select brand
- select role for that brand
- mark as primary
- remove row before submit

Use shadcn UI and Sonner:

- Button, Card, Input, Label, Select, Dialog, Table, Badge, DropdownMenu, AlertDialog, Checkbox,
  Separator, Skeleton, Sonner toaster.

Zustand stores only:

- selected account
- dialog open states
- search query
- role/brand/status filters
- temporary client-side form UI state

## Testing

- / redirects correctly by session and account type.
- Initial seeded EXECUTIVE can log in.
- CLIENT/EMPLOYEE go to employee dashboard.
- SUPERVISOR/MANAGER/EXECUTIVE go to admin dashboard.
- CLIENT/EMPLOYEE require at least one active brand assignment.
- CLIENT/EMPLOYEE should have one primary active brand.
- SUPERVISOR/MANAGER/EXECUTIVE can have zero brand assignments.
- SUPERVISOR/MANAGER/EXECUTIVE do not require primary brand.
- SUPERVISOR/MANAGER/EXECUTIVE can still have multiple brand assignments if needed.
- SUPERVISOR/MANAGER/EXECUTIVE with multiple primary brand flags does not fail validation.
- Create CLIENT with multiple brands succeeds.
- Create EMPLOYEE with multiple brands succeeds.
- CLIENT/EMPLOYEE without brand assignment fails validation.
- CLIENT/EMPLOYEE without primary brand fails validation.
- CLIENT/EMPLOYEE with more than one primary brand fails validation.
- SUPERVISOR/MANAGER/EXECUTIVE without brand assignment succeeds.
- SUPERVISOR/MANAGER/EXECUTIVE with multiple brand assignments succeeds.
- SUPERVISOR/MANAGER/EXECUTIVE without primary brand succeeds.
- One profile can have multiple active brand assignments.
- One profile can have different roles per brand.
- Brand access can be deactivated/revoked without deleting history.
- CLIENT/EMPLOYEE permission check with brandId uses that brand’s role.
- CLIENT/EMPLOYEE permission check without brandId checks across any active brand access.
- AccountInvite can store multiple brand-role assignments.
- Admin-side AccountInvite with multiple primary brand flags does not fail validation.
- Accepting invite creates multiple UserBrandAccess rows.
- Duplicate brand assignment in one account creation request is rejected.
- No protected route uses mock localStorage auth.
- Disabled, suspended, and archived profiles cannot access dashboards.
- Brand-scoped overrides work.
- Global override uniqueness is enforced when brandId is null.
- DENY beats role permission.
- ALLOW grants missing permission.
- Expired override is ignored.
- Account creation creates Better Auth user, Prisma profile, and multiple brand access rows.
- Failed custom writes clean up or disable the Better Auth user.
- npx prisma validate, npm run lint, and npm run build pass.
