# Meta webhook production deploy

Production must deploy from a commit that includes:

- `app/api/meta/webhook/route.ts`
- `app/api/meta/cron/route.ts`
- `lib/meta/*`

Latest verified commit lineage: `27435fc` → `1d76cdd` on `main`.

If Vercel was rolled back, redeploy **main** (or promote a deployment built from `main` HEAD).
