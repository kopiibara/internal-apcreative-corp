# DRY Principle Guide

## Purpose

This project must follow the DRY principle: **Don’t Repeat Yourself**.

Any repeated logic, UI pattern, validation rule, status list, filter bar, table setup, or permission rule should be extracted into a reusable helper, constant, hook, store, or component.

This prevents inconsistencies across modules such as approvals, content reports, account control, ads campaigns, and future dashboard pages.

---

## Core Rule

If the same logic or UI appears in more than one place, do not copy and paste it.

Create a shared source of truth.

---

## What Must Be Shared

### Status Values

Do not repeat status arrays in multiple files.

Bad:

```ts
const statuses = ["Pending", "Approved", "Rejected", "Revision"];
```

---

## Staff Accountability Scoring Rules

Staff Accountability must keep completion rate and points separate.

Completion rate answers: how many assigned graded tasks did the employee
complete?

```txt
Completed graded tasks / total assigned graded tasks * 100
```

Points answer: how valuable were the completed graded tasks based on priority?

```txt
Sum of priority points from completed graded tasks only
```

Use the shared scoring helpers in `lib/performance-scoring.ts` and
`lib/daily-report-metrics.ts` for dashboards, charts, leaderboards, summary
cards, and reports. Do not calculate Staff Accountability scoring inside React
components.

Priority point mapping:

```txt
LOW = 2 pts
MEDIUM = 5 pts
HIGH = 10 pts
URGENT = 15 pts
```

Included tasks:

- `GRADED` task assignments only.

Excluded tasks:

- `NON_GRADED` personal tasks.
- Reminders.
- Approval requests, except for separate approval-count summaries.

Completed status:

- `DONE` counts as completed and earns priority points.

Incomplete statuses:

- `ASSIGNED`, `PENDING`, `REVISION`, and `BLOCKER` do not count as completed and
  earn `0` points.

Example:

```txt
8/10 completed low-priority graded tasks = 80% completion and 16 pts, not 80 pts.
```
