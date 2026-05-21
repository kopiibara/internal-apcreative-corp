# Date Picker Standards

## Purpose

All date picker fields in this project should use shadcn `Calendar` instead of native browser date inputs.

## Core Rules

- Use shadcn `Calendar` for all date picking.
- Use `Popover` and `Button` for date picker UI.
- Use a reusable `DateTimePicker` component when date and time are both needed.
- Avoid native browser date/time picker UI for major dashboard forms.
- Keep date formatting consistent and readable.
- Validate date values on the server with Zod.
- Store datetime values in the database as `TIMESTAMPTZ` when time matters.
- Use reusable components instead of rewriting date picker logic.
# Date Picker Standards

## Purpose

All major date picker fields in this project must use `shadcn/ui` Calendar components instead of native browser date/time picker UI.

This keeps forms consistent, professional, and easier to maintain across the dashboard.

## Core Rule

Use `shadcn/ui` Calendar for date selection.

Do not use native browser date picker UI for major dashboard forms.

## Required Pattern

Use:

- `Calendar`
- `Popover`
- `Button`
- Optional time controls when time is required

Recommended reusable component:

```txt
components/ui/date-time-picker.tsx
```
