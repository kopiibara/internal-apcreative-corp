# AP Creative Internal Dashboard

Internal dashboard for AP Creative account management, content approvals, task work, reminders, daily progress reporting, paid media, platform analytics, PR requests, brand operations, staff accountability, and internal forms.

The app uses Next.js App Router with server-side authentication, PostgreSQL-backed authorization, and role/brand-scoped dashboard modules. It is built for internal operators, employees, PR users, clients, and admin-side leadership accounts.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL through `pg`
- Better Auth with PostgreSQL `Pool`
- shadcn/ui and Radix UI primitives
- Tailwind CSS 4
- Zustand for UI state only
- Zod for validation
- Sonner for notifications
- TanStack Table for data tables
- Recharts for charts
- dnd-kit for Kanban drag and drop
- Plate.js for rich text editing
- Google APIs, Meta Graph API, TikTok OAuth, and web push integrations
- release-it with Conventional Changelog

Prisma is not used in this project. Do not add Prisma Client, Prisma Adapter, Prisma schema files, Prisma migrations, or Prisma commands unless the project owner changes that decision.

## Main Features

### Authentication And Access

- Better Auth email/password login with cookie-based sessions.
- Server-side profile loading through PostgreSQL.
- Account routing by account type.
- Forced password change support.
- Account settings and avatar support.
- Permission-filtered dashboard navigation.

### Admin Dashboard

- Dashboard overview at `/admin`.
- Account Control for creating, editing, disabling, soft deleting, password forcing, and reviewing account activity.
- Brand management with brand cards, analytics summaries, approval totals, images, and filtering.
- Approval review workflow with Kanban and table views, director/supervisor/publishing review states, revision requests, scheduling, and publishing proof.
- To-Do tasks with assignment, proof submission, revision, blockers, status history, scoring overrides, and Kanban boards.
- Reminders with board views and status tracking.
- Daily Reports and Daily Progress dashboards with charts, tables, timelines, export actions, and scoring helpers.
- Staff Accountability dashboard with points, completion rate, deductions, charts, and leaderboard summaries.
- Platform Analytics for Meta, TikTok, and YouTube data.
- Ads Campaigns dashboard with Meta and Google Ads CSV import support.
- PR request management.
- Internal forms.
- Public changelog page at `/changelog`.

### Employee Dashboard

- Brand-scoped dashboard at `/employee/dashboard`.
- Employee approvals and content report submission.
- Employee task board, proof upload, blockers, revisions, and reminders.
- Daily progress submission and personal report history.
- PR request workflow.
- Platform analytics access when permitted.
- Ads campaigns access when permitted.
- Sidebar performance summary for eligible account types.

### Integrations

- Better Auth API route at `/api/auth/[...all]`.
- Meta webhook and cron routes under `/api/meta`.
- TikTok OAuth, callback, and cron routes under `/api/integrations/tiktok`.
- YouTube OAuth routes under `/api/platform-analytics/youtube`.
- Web push service worker at `public/sw.js`.

## Access Model

Better Auth owns identity and sessions. The custom PostgreSQL `profile` table owns dashboard business logic.

```txt
Better Auth "user"
-> profile
-> user_brand_access
-> brand

profile
-> user_brand_access
-> role
-> role_permission
-> permission
```

Account types currently used by the codebase:

- `CLIENT`
- `EMPLOYEE`
- `PR`
- `SUPERVISOR`
- `MANAGER`
- `EXECUTIVE`
- `DIRECTOR`
- `FULL_STACK_DEVELOPER`

Employee-side account types route to the employee dashboard:

- `CLIENT`
- `EMPLOYEE`
- `PR`

Admin-side account types route to the admin dashboard:

- `DIRECTOR`
- `SUPERVISOR`
- `MANAGER`
- `EXECUTIVE`
- `FULL_STACK_DEVELOPER`

Active admin-side accounts have organization-wide brand semantics. Most admin-side account types bypass normal role-permission SQL checks when active. `FULL_STACK_DEVELOPER` is an admin-side account type with special task access behavior.

CLIENT, EMPLOYEE, and PR users rely on active brand access, roles, permissions, and permission overrides.

## Authorization Rules

Protected pages, server actions, and sensitive API routes must:

1. Read the Better Auth session server-side.
2. Load the matching `profile` from PostgreSQL.
3. Reject non-`ACTIVE` profiles.
4. Check account type and permission requirements.
5. Check brand access for scoped data.
6. Validate input with Zod.
7. Sanitize user-generated text before storing it.
8. Apply rate limiting for sensitive mutations.
9. Use parameterized SQL through `lib/db.ts`.
10. Use transactions for multi-table writes.
11. Revalidate affected routes after mutations.
12. Return `{ success, message, data? }`.

Permission resolution order:

1. Ignore expired overrides.
2. `DENY` override wins.
3. `ALLOW` override grants.
4. `role_permission` grants.
5. Deny by default.

Never store sessions, tokens, profile data, account type, permissions, roles, or brand access in localStorage or Zustand. Zustand is only for UI state such as filters, selected records, and dialog state.

## Database

The database layer lives in `lib/db.ts` and exports:

- `pool`
- `query(text, params)`
- `transaction(callback)`

Use SQL migrations in `db/migrations`. Do not manually alter normal development schemas outside migrations.

The migration runner:

- Creates `schema_migrations` if missing.
- Reads `.sql` files from `db/migrations`.
- Sorts migrations by filename.
- Skips already-applied migrations.
- Runs each pending migration inside a transaction.
- Records successful filenames in `schema_migrations`.

Migration command:

```bash
npm run db:migrate
```

Important database rules:

- Use PostgreSQL through `pg`.
- Use parameterized SQL for all user input.
- Use `transaction` for multi-step writes.
- Do not add `brand_id` directly to `profile`.
- Do not hard delete `user_brand_access`; revoke it with `is_active = false` and `revoked_at = now()`.
- Do not add Prisma files or commands.

## Environment Variables

Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

Required core variables:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL="http://localhost:3000"
DEFAULT_TEMPORARY_PASSWORD=
```

Bootstrap variables:

```env
INITIAL_EXECUTIVE_EMAIL=
INITIAL_EXECUTIVE_PASSWORD=
INITIAL_EXECUTIVE_NAME=
INITIAL_ROLE=
```

Testing helpers:

```env
TESTING_DATABASE_URL=
CONFIRM_TEST_DB_CLEAN="YES"
CONFIRM_TEST_DB_SEED="YES"
TEST_ACCOUNT_PASSWORD=
```

`DATABASE_URL` is preferred. `LIVE_DATABASE_URL` is used as a fallback by the database URL resolver. Hosted PostgreSQL providers such as Neon, Supabase, Render, Railway, or AWS are given SSL settings by the script database helper.

Integration-specific variables may be needed for Meta, TikTok, YouTube, Google Ads import workflows, webhook verification, token encryption, and push notifications. Check the matching files under `lib/meta`, `lib/tiktok`, `lib/youtube`, `lib/platform-analytics`, and `lib/integrations` before enabling those modules.

## Local Development

Install dependencies:

```bash
npm install
```

Run migrations:

```bash
npm run db:migrate
```

Create the initial admin-side account:

```bash
npm run db:create-executive
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Root routing behavior:

- No session redirects to `/login`.
- Inactive profiles redirect to `/login`.
- Admin-side active profiles redirect to `/admin`.
- Employee-side active profiles redirect to `/employee/dashboard`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:migrate
npm run db:create-executive
npm run db:create-executive-node
npm run db:seed-approval-kanban
npm run db:clear-approval-kanban
npm run db:test:clean
npm run db:test:seed
npm run meta:register-page
npm run meta:verify-schema
npm run meta:test-webhook
npm run meta:debug-new-likes
npm run release:dry
npm run release
```

Use `release:dry` before `release`. Releases use Conventional Commits and generate `public/CHANGELOG.md`.

## Project Structure

```txt
app/
  admin/                  Admin dashboard routes and server actions
  employee/               Employee dashboard routes and server actions
  account/                Account settings
  api/                    Better Auth and integration API routes
  changelog/              Public changelog page
  login/                  Login route

components/
  admin/                  Admin feature components
  employee/               Employee feature components
  layout/                 Dashboard shell and sidebar
  shared/                 Shared dashboard components
  to-do/                  Shared task and reminder UI
  ui/                     shadcn/ui components and reusable UI primitives
  reui/                   Timeline, Kanban, frame, and badge primitives

db/
  migrations/             SQL migrations

docs/
  *.md                    Architecture, database, design, security, and workflow standards

lib/
  auth/                   Better Auth, session, account type, and account helpers
  approvals/              Approval workflow helpers
  brands/                 Brand and brand analytics helpers
  daily-reports/          Daily report data, metrics, chart helpers, and filters
  daily-progress-report/  Daily progress report logic and scoring
  meta/                   Meta Graph API, webhook, analytics, and sync helpers
  platform-analytics/     Cross-platform analytics loaders, adapters, charts, and access
  pr/                     PR request workflow, schema, labels, permissions, and timeline
  reminders/              Reminder data access and statuses
  security/               Sanitization and rate-limit guards
  tasks/                  Task board data, access, filters, statuses, proof, and scoring helpers
  tiktok/                 TikTok OAuth, sync, config, and integration data
  youtube/                YouTube OAuth, tokens, analytics, and channel helpers
  db.ts                   PostgreSQL pool, query helper, and transaction helper
  permissions.ts          Permission resolver
  rate-limit.ts           PostgreSQL-backed rate limiting

scripts/
  *.ts                    Migration, bootstrap, seed, testing, and integration utility scripts

stores/
  *.ts                    Zustand UI stores only

types/
  *.ts                    Shared TypeScript types
```

## UI Standards

- Use shadcn/ui components when available.
- Use shadcn `Calendar`, `Popover`, and reusable date/date-time picker components for dashboard date fields.
- Use shadcn `ScrollArea` for major scrollable UI sections.
- Use Sonner for user-facing mutation feedback.
- Keep Zustand state limited to UI concerns.
- Use the REUI Timeline component for timeline, activity log, history, and status-history UI.
- Follow the AP Creative Neo-Brutalism design tokens and rollout notes in `docs/neo-brutal.md` and `docs/neo-brutal-rollout.md`.

## Development Standards

- Keep page files focused on loading data, checking access, and composing components.
- Move repeated UI and logic into shared helpers, constants, hooks, stores, or components.
- Review files over 250 lines for possible splitting.
- Split mixed-responsibility files over 400 lines when practical.
- Avoid `any`.
- Keep SQL, permissions, sanitization, rate limits, and secrets on the server.
- Use server actions for dashboard mutations.
- Use Conventional Commits for releasable changes.

## Validation Before Shipping

Run:

```bash
npm run lint
npm run build
```

For database changes, also run:

```bash
npm run db:migrate
```

For release work:

```bash
npm run release:dry
```

## Reference Docs

Read these before changing related code:

- `docs/database-schema.md`
- `docs/project-architecture.md`
- `docs/project-flow.md`
- `docs/clean-code-standards.md`
- `docs/security-standards.md`
- `docs/dos-and-donts.md`
- `docs/migration-guide.md`
- `docs/date-picker-standards.md`
- `docs/scroll-area-layout.md`
- `docs/neo-brutal.md`
- `docs/neo-brutal-rollout.md`
- `docs/dry-principle.md`
- `docs/reui-timeline-standards.md`
