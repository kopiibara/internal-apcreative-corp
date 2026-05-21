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
