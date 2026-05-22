# Neo-Brutalism Rollout Plan

## Purpose

The dashboard will adopt the AP Creative Neo-Brutalism design language gradually and safely. This is a visual/design-system rollout only. It must not break authentication, authorization, database logic, server actions, reports, Kanban workflows, or business rules.

## References

- `docs/neo-brutal.md`
- `app/globals.css`
- https://www.neobrutalism.dev/docs

## Core Rule

Update the design page per page. Do not redesign the entire app in one large change.

## Global CSS Rule

When updating `app/globals.css`:

- Do not remove existing CSS variable names.
- Do not remove `@theme inline`.
- Do not remove dark mode variables.
- Do not remove shadcn-compatible tokens.
- Only update values and add Neo-Brutalism AP tokens.

Existing entities must remain available because many shadcn/ui components depend on them.

## AP Neo-Brutalism Tokens

Use these AP colors:

```css
--blue: #1d2d89;
--blue-2: #26408b;
--cyan: #209cbb;
--red: #f21424;
--magenta: #a72a6f;
--cream: #f8f3e8;
--paper: #f5f4f1;
--white: #ffffff;
--ink: #111111;
--neo-muted: #5f6470;
```

Use these shadows:

```css
--shadow-hard: 7px 7px 0 #111111;
--shadow-hard-sm: 4px 4px 0 #111111;
--shadow-soft: 0 24px 70px rgba(29, 45, 137, 0.12);
```

## Implementation Order

1. Login Page
2. Dashboard Shell / Sidebar / Header
3. Admin Dashboard
4. Employee Dashboard
5. Admin Approvals
6. Employee Approvals
7. Admin To-Do Tasks
8. Employee To-Do Tasks
9. Reminders
10. Daily Reports
11. Staff Accountability
12. Account Control
13. Brands
14. Platform Analytics
15. Ads & Campaigns

## Component Rule

Use Neobrutalism components carefully. Do not overwrite every shadcn component at once. Install/update components one at a time and check compatibility.

## Do Not Break

Do not break:

- Better Auth
- PostgreSQL `pg`
- permissions
- role routing
- sidebar badges
- wide route collapsed sidebar
- approvals
- to-do workflow
- blocker workflow
- reminders
- daily reports
- staff accountability
- charts
- sheets/dialogs
- ScrollArea behavior
- DateTimePicker behavior

## Acceptance Criteria

- Visual design changes are applied safely.
- Existing functionality remains working.
- Each page is updated in its own focused step.
- Shared components are updated before repeated page styling.
- No duplicated styling logic.
- No Prisma usage.
- No auth/security logic changes.

## Progress Log

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1 Global CSS tokens | Done | `app/globals.css` AP palette + utilities |
| 2 Shared UI (safe) | Done | Button, Card, Input, Badge |
| 4 Login | Done | Login page + form |
| 5 Dashboard shell | Done | Shell header + sidebar accents |
| UI polish | Done | Overlay z-index, filter controls, page transitions |
| 3–15 Feature pages | Pending | Page-by-page in follow-up tasks |
