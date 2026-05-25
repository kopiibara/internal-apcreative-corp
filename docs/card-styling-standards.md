# AP Creative Dashboard Card Styling Standards

This document is the styling source of truth for all new cards, panels, KPI modules, Kanban cards, sheet sections, dialogs, and dashboard blocks in the internal AP Creative dashboard.

The dashboard must visually connect with the public AP Creative website direction: bold strategy-first typography, cream/paper backgrounds, dotted grid texture, AP red/blue/cyan/magenta accents, strong black outlines, and clean Neo-Brutal component structure.

---

## 1. Design Direction

All dashboard cards should feel like part of the AP Creative brand system:

- Bold, confident, and structured.
- Creative but still professional for internal operations.
- Flat, high-contrast, and readable.
- Inspired by the AP Creative website’s “growth system” visual language.
- Built with strong black borders, rounded corners, AP color accents, and clear typography.

Cards should never feel like generic SaaS cards.

---

## 2. Required Card Base

Every card, panel, sheet section, dashboard module, KPI block, and Kanban card should start from this visual direction:

```tsx
<Card className="rounded-lg border-2 border-black bg-card p-4">
  ...
</Card>
```

Required styling:

- `rounded-lg`
- `border-2 border-black`
- `bg-card`, `bg-background`, `bg-[var(--ap-paper)]`, or `bg-[var(--ap-cream)]`
- consistent padding
- clear section heading
- readable text contrast
- flat background
- no soft shadows

Allowed additions:

- hard Neo-Brutal offset shadow if already part of the component system
- color-coded border/background accents
- subtle dotted-grid background only when readability remains strong

Do not use:

- `rounded-none`
- `rounded-[0px]`
- `shadow-lg`
- `shadow-xl`
- `drop-shadow`
- `backdrop-blur`
- random arbitrary backgrounds
- one-off card styles that do not match the system

---

## 3. AP Creative Color System

Use AP Creative accents consistently.

Recommended tokens:

```css
:root {
  --ap-cream: #f8f3e8;
  --ap-paper: #f5f4f1;
  --ap-ink: #111111;
  --ap-blue: #1d2d89;
  --ap-cyan: #209cbb;
  --ap-red: #f21424;
  --ap-magenta: #a72a6f;
}
```

### Semantic Usage

| Purpose | Color Direction |
|---|---|
| Primary action | AP Blue |
| High-energy CTA | AP Red |
| Info / progress / pending | AP Cyan or Blue |
| Special / points / featured | AP Magenta or Blue |
| Success / approved / done | Green |
| Warning / revision / needs review | Yellow or Orange |
| Critical / blocker / rejected / destructive | Red |
| Neutral / inactive / archived | Gray or Paper |

Do not randomly assign colors per page. The same meaning should use the same color across the dashboard.

---

## 4. Background Styling

Authenticated dashboard pages should use the AP Creative website-inspired background, not only the login page.

Background direction:

- cream/paper base
- subtle dotted grid overlay
- soft AP radial gradients
- content stays above background layers
- overlays, popovers, dialogs, sheets, and dropdowns remain clickable

Recommended global background:

```css
body {
  background:
    radial-gradient(circle at 8% 10%, rgba(242, 20, 36, 0.08), transparent 26%),
    radial-gradient(circle at 92% 6%, rgba(32, 156, 187, 0.12), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, var(--ap-cream) 38%, #ffffff 100%);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 6px 6px;
  mix-blend-mode: multiply;
}
```

Important:

- App content should use `relative z-[1]`.
- Do not use a high z-index for background overlays.
- Dialog/sheet overlays must stay above the background.
- Do not let dotted grids cover text readability.

---

## 5. Typography Rules

Dashboard typography must follow the AP Creative website direction: bold, clear, and systemized.

### Page Titles

Use strong, confident headings.

Recommended:

```tsx
<h1 className="text-2xl font-black tracking-tight md:text-4xl">
  Staff Accountability
</h1>
```

Rules:

- Use bold or black weight for page titles.
- Keep tracking tight for large headings.
- Do not use thin/light page titles.
- Keep titles readable on mobile.

### Section Labels / Eyebrows

Use small uppercase labels with letter spacing.

```tsx
<p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
  Performance Overview
</p>
```

Use for:

- KPI labels
- section categories
- metadata group labels
- sidebar group labels
- card eyebrows

### Card Titles

```tsx
<h2 className="text-base font-bold md:text-lg">
  Employee Leaderboard
</h2>
```

Card titles should be:

- bold
- short
- easy to scan

### KPI Values

```tsx
<p className="text-3xl font-black tracking-tight">
  80%
</p>
```

KPI values should be:

- large
- bold
- high contrast
- not overly decorative

---

## 6. Card Anatomy

A standard dashboard card should include:

1. Optional eyebrow label
2. Title
3. Supporting description
4. Main content/value
5. Optional badges/actions

Example:

```tsx
<Card className="rounded-lg border-2 border-black bg-card p-4">
  <div className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
      Team Score
    </p>
    <h3 className="text-lg font-bold">Average Completion</h3>
    <p className="text-3xl font-black tracking-tight">80%</p>
    <p className="text-sm text-muted-foreground">8 out of 10 graded tasks completed.</p>
  </div>
</Card>
```

---

## 7. KPI / Summary Cards

KPI cards should be compact, colorful, and consistent.

Required:

- label
- value
- supporting text
- optional icon
- optional color accent

Recommended variants:

```tsx
<Card className="rounded-lg border-2 border-black bg-green-100 p-4">
  ...
</Card>
```

```tsx
<Card className="rounded-lg border-2 border-black bg-blue-100 p-4">
  ...
</Card>
```

Use color meaningfully:

- Green = success/completed/approved
- Blue/Cyan = progress/info/pending
- Yellow/Orange = review/revision/warning
- Red = blocker/rejected/critical
- Purple/Magenta = points/special metrics

---

## 8. Kanban Cards and Columns

Kanban boards must follow the same visual structure across modules.

### Kanban Column

```tsx
<div className="flex max-h-[70vh] min-h-[220px] flex-col overflow-hidden rounded-lg border-2 border-black bg-card">
  <div className="flex shrink-0 items-center justify-between border-b-2 border-black px-4 py-3">
    <h3 className="font-bold">Pending</h3>
    <StatusBadge status="Pending" />
  </div>

  <ScrollArea className="min-h-0 flex-1">
    <div className="space-y-3 p-4">
      ...
    </div>
  </ScrollArea>
</div>
```

Column rules:

- rounded-lg
- border-2 border-black
- header has bottom border
- count badge aligned right
- body scrolls internally when long
- no page-height explosion from long columns

### Kanban Card

```tsx
<Card className="rounded-lg border-2 border-black bg-background p-4">
  ...
</Card>
```

Kanban cards should show:

- clear title
- short metadata
- status badges
- key dates
- action buttons

Card rules:

- consistent padding
- badges grouped neatly
- no crowded text
- no manual badge colors
- no random button classes

---

## 9. Sheet / Dialog Section Cards

Sheets and dialogs should use the same card styling system.

Use for:

- Approval details
- Task details
- Reminder details
- Account details
- Review forms

Section example:

```tsx
<section className="rounded-lg border-2 border-black bg-card">
  <header className="border-b-2 border-black px-4 py-3">
    <h3 className="font-bold">Request Details</h3>
  </header>

  <div className="space-y-3 p-4">
    ...
  </div>
</section>
```

Rules:

- same rounded-lg radius
- same section header style
- same body padding
- no soft shadows
- no blur overlays
- black dialog/sheet backdrop

---

## 10. Buttons Inside Cards

Buttons must use the shared `Button` component.

Primary action:

```tsx
<Button>
  Save Changes
</Button>
```

Destructive action:

```tsx
<Button variant="destructive">
  Delete
</Button>
```

Rules:

- Do not manually style delete buttons.
- Do not use raw `<button>` unless absolutely necessary.
- Buttons should inherit the shared Neo-Brutal hover/active behavior.
- Buttons should keep rounded-lg/global radius.

Expected button interaction:

- default: strong black border and hard offset shadow
- hover: slight movement or stronger offset
- active: pressed movement and reduced offset
- no soft shadow

---

## 11. Badges Inside Cards

Status, priority, proof, account, brand, campaign, and performance badges must use the shared badge system.

Preferred:

```tsx
<StatusBadge status={task.status} type="task" />
<StatusBadge status={task.priority} type="priority" />
<StatusBadge status={approval.publishStatus} type="publish" />
```

Do not do this:

```tsx
<Badge className="border-black bg-white text-black">Pending</Badge>
```

Badge rules:

- color-coded
- consistent radius
- readable text
- strong border
- no duplicated status color mapping in feature components

---

## 12. Tables and Rows

Tables should still follow the card system.

Table container:

```tsx
<div className="overflow-hidden rounded-lg border-2 border-black bg-card">
  <Table>
    ...
  </Table>
</div>
```

Rules:

- table wrapper uses rounded-lg and border-2
- table headers are bold and readable
- status cells use `StatusBadge`
- row hover should be subtle and flat
- no soft shadows

---

## 13. Forms Inside Cards

Inputs, selects, textareas, and date pickers should follow the same radius and border system.

Rules:

- rounded-lg
- strong border
- readable labels
- consistent height
- no default sharp imported component style
- no border-radius 0

Labels:

```tsx
<Label className="text-xs font-bold uppercase tracking-[0.16em]">
  Status
</Label>
```

---

## 14. Mobile Rules

Cards must remain clean on mobile.

Mobile requirements:

- compact padding
- no horizontal overflow
- readable headings
- cards do not become too tall unnecessarily
- KPI cards can use 2-column layouts when space allows
- Kanban boards scroll horizontally instead of stacking vertically
- long card lists scroll inside their status columns

Recommended responsive padding:

```tsx
className="rounded-lg border-2 border-black bg-card p-3 md:p-4"
```

---

## 15. DRY Rules

Do not duplicate styling logic.

Best order:

1. Update shared UI components.
2. Use shared `Card`, `Button`, `Badge`, `StatusBadge`, `ScrollArea`, `Sheet`, `Dialog`.
3. Add feature-specific classes only when required.
4. Avoid large repeated class strings across modules.

Do not create a new card style for every feature.

If a component already exists, use it.

---

## 16. Do / Do Not

### Do

- Use rounded-lg/global radius.
- Use strong black borders.
- Use AP Creative colors intentionally.
- Use uppercase letter-spaced labels.
- Use bold page/card titles.
- Use shared UI components.
- Keep cards readable and compact.
- Keep mobile responsive.

### Do Not

- Use sharp 0 radius.
- Add soft shadows.
- Add blur effects.
- Use random card colors.
- Hardcode status badge classes.
- Manually style delete buttons.
- Duplicate card class logic.
- Make dashboard cards look unrelated to the AP Creative website.

---

## 17. Acceptance Checklist

Before completing any feature that adds or edits cards, confirm:

- [ ] Cards use rounded-lg/global radius.
- [ ] Cards use strong black borders.
- [ ] Cards use AP Creative color accents where useful.
- [ ] Cards use consistent typography.
- [ ] Buttons use shared `Button`.
- [ ] Statuses use shared `StatusBadge`.
- [ ] Delete actions use `Button variant="destructive"`.
- [ ] No soft shadows were added.
- [ ] No blur effects were added.
- [ ] No duplicated card styling logic was introduced.
- [ ] Mobile layout remains clean.
- [ ] The result visually matches the AP Creative website-inspired dashboard direction.
