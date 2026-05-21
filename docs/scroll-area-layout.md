# Scroll Area Layout Guide

## Purpose

All major scrollable UI areas in this project should use `shadcn/ui` `ScrollArea` instead of plain visible overflow scrolling.

This keeps scroll behavior consistent, accessible, and easier to maintain across modules.

## Core Rule

Use `ScrollArea` for intentional scrollable UI sections.

Avoid using plain `overflow-y-auto` or `overflow-auto` as the main scroll solution for large visible UI areas.

## 1. Use ScrollArea For

- Kanban column card lists
- Details sheets with long content
- Modal content with long forms
- Sidebar inner scroll areas
- Data table scrollable content when applicable
- Long activity timelines
- Any reusable section where users intentionally scroll content

## 2. Avoid Plain Overflow For Major UI

Plain `overflow-y-auto` / `overflow-auto` are allowed only for small wrappers or technical layout containment, such as:

- `overflow-hidden` for shell containment
- `overflow-x-auto` for horizontal table or Kanban board wrappers when `ScrollArea` is not practical
- Small isolated utility wrappers

## 3. Kanban Rule

Each Kanban column should use `ScrollArea` for its internal card list.

The column header stays fixed. The page should not become vertically long because one column has many cards.

## 4. Sheet and Dialog Rule

Long sheet or modal content should use `ScrollArea` internally.

The close button, header, and footer should remain usable.

## 5. Layout Rule

Use `min-h-0` and `min-w-0` on flex/grid parents when needed so `ScrollArea` works correctly.

## 6. DRY Rule

If scroll behavior repeats in multiple components, create a reusable wrapper component.

Recommended:

```txt
components/ui/scrollable-section.tsx
```

## 7. Avoid Duplicate Scrollbars

Do not nest multiple scroll areas unless necessary.

Only one visible scrollbar should appear per intentional scroll area.
