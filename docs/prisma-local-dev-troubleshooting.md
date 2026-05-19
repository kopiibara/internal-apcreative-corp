# Prisma local dev — Studio troubleshooting (Windows)

## What you are seeing

| Symptom | Meaning |
|---------|---------|
| Studio on `http://localhost:51212` | Port used by **`npx prisma dev`** (not a normal standalone Studio port) |
| `ERR_STREAM_UNABLE_TO_PIPE` | Known **Prisma Studio 7.x** bug (especially with `prisma dev` on Windows) |
| "Schema metadata unavailable" / Introspection failed | Studio cannot finish Postgres catalog queries through its `/bff` API |

Your database is usually fine. Verify with:

```bash
npx prisma migrate status
npx prisma db seed
```

If those succeed, migrations and seed data are OK — only the Studio UI path is broken.

## Root cause (two things stacked)

1. **`prisma dev` + second `prisma studio`**  
   If `prisma dev` is running, do **not** also run `npx prisma studio` in another terminal. Both fight for the same Studio/proxy on port **51212** and the HTTP stream breaks.

2. **Prisma Studio 7.8 bug**  
   [prisma/studio#1479](https://github.com/prisma/studio/issues/1479) — stream errors and failed introspection on Windows with local Prisma Postgres. Not caused by your `schema.prisma`.

## Correct workflow (Prisma local Postgres)

### Terminal 1 — only this should run the database

```bash
npx prisma dev
```

Leave it open. Use the **`postgres://...`** URL it prints for `.env` → `DATABASE_URL` (port is often **51214**).

### Open Studio — pick ONE option

**Option A (recommended):** Use the Studio link printed by `prisma dev` in Terminal 1.  
Do **not** run `npx prisma studio` separately.

**Option B:** Stop `prisma dev`, use Docker/normal Postgres on port 5432, then:

```bash
npx prisma studio --port 5555
```

## If introspection still fails

1. Stop every `node` process (Task Manager → end Node.js tasks).
2. Start fresh: `npx prisma dev` only.
3. Hard-refresh the browser (Ctrl+Shift+R) or use a private window.
4. In Chrome DevTools → **Network**, filter `bff` — check if requests fail or return errors.
5. Keep `DATABASE_URL` simple:

   ```env
   DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
   ```

   Do not add `connect_timeout=0`, `socket_timeout=0`, or `uselibpqcompat=true`.

## Stable alternative: Docker Postgres

If `prisma dev` Studio keeps failing, use a normal Postgres instance:

```bash
docker run --name apcreative-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
```

```bash
npx prisma migrate deploy
npx prisma db seed
npx prisma studio --port 5555
```

Your app (`lib/prisma.ts`) works the same with this URL.

## View data without Studio

```bash
npx prisma db seed
# Query via app, or use DBeaver / pgAdmin with the same DATABASE_URL
```
