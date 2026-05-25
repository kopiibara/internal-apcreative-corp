# Clean Code Standards

## General Rules

- Keep files focused.
- Keep components small.
- Avoid giant mixed UI/business logic files.
- Prefer clear names.
- Do not reintroduce Prisma.
- Keep changes scoped.

## TypeScript

Avoid `any`.

Use clear types for account types, rows, action results, and form inputs.

## SQL

Use parameterized SQL.

Good:

```ts
await query("SELECT * FROM profile WHERE id = $1", [profileId])
```

Bad:

```ts
await query(`SELECT * FROM profile WHERE id = ${profileId}`)
```

Use transactions for multi-table writes.

## Server Actions

Every server action must:

1. Authenticate.
2. Authorize.
3. Validate with Zod.
4. Mutate through SQL helpers.
5. Revalidate.
6. Return typed result.

Recommended result:

```ts
type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}
```

## UI

Use shadcn/ui components and Sonner.

Do not use random custom colors.

## Folder Pattern

```txt
app/admin/accounts/
  page.tsx
  actions.ts
  schema.ts

components/admin/accounts/
  account-table.tsx
  account-form-dialog.tsx
  account-brand-access.tsx

lib/
  db.ts
  auth-session.ts
  permissions.ts
```

## Long File Guideline

- **250+ lines**: review for split (filters, tables, charts, dialogs, helpers).
- **400+ lines**: likely should move UI blocks into `components/<feature>/`.
- **600+ lines**: split unless there is a strong reason not to.

Page files should fetch data, check access, and compose components — not hold all markup and helpers.

## Server / Client Boundary

- Server actions and `lib/**` services own auth, permissions, SQL, validation, sanitization, and rate limits.
- Client components own UI state and interaction only.
- Never place SQL, env secrets, or permission enforcement only in client code.
