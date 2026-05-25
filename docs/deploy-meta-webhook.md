# Meta webhook & Platform Analytics — production deploy

## How to tell production is up to date

Open **Admin → Platform Analytics** (`/admin/platform-analytics`).

| What you see | Meaning |
|--------------|---------|
| Title **"Platform Analytics"**, **Meta connection status** card, **Connect & sync** buttons | **Current** build (includes `cce77aa` / PR #11) |
| Title **"Facebook Page Monitoring"**, no connection status card, only **Sync posts** / **Sync page totals** | **Stale** deployment — redeploy required |

## Required commit on `main`

Production must deploy from `main` at or after:

- **`311e645`** — Merge PR #11 (`staging` → `main`)
- **`cce77aa`** — Facebook Meta API + Platform Analytics dashboard

Includes:

- `app/api/meta/webhook/route.ts`
- `app/api/meta/cron/route.ts`
- `lib/meta/*` (including `bootstrap.ts`, `connection-status.ts`)
- `components/admin/platform-analytics/meta-facebook-monitoring-dashboard.tsx`

## Vercel redeploy (production)

1. Vercel → project for **internal.apcreativecorp.com**
2. **Settings → Git** → Production branch = **`main`**
3. **Deployments** → latest **`main`** deployment → **Redeploy** (or push any commit to `main` to auto-deploy)
4. **Settings → Environment Variables** (Production):  
   `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_CRON_SECRET`
5. After deploy: run **Connect & sync** on Platform Analytics (needs `meta_monitoring.manage`)

## Database

Run migrations on the **production** database (not only local):

```bash
npm run db:migrate
```

Migration: `020_meta_facebook_monitoring.sql`

## Deploy via pull request (staging → main)

Merge a PR from `staging` into `main` to trigger a fresh Vercel production deployment when branches were already in sync.

## If production still shows the old UI after redeploy

- Confirm the deployment commit is `311e645` or newer (Vercel deployment details).
- You are not viewing a cached tab on an old preview URL.
- Production is not pinned to branch `feat/account-creation-and-approval-request` or an old deployment rollback.
