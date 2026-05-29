# Environment variables (local + production)

Copy these into `.env.local` (local) and into your hosting provider (Vercel → **internal.apcreativecorp.com** → Environment Variables).

**Never commit real secrets to git.** Env files matching `.env*` are gitignored.

Page access tokens are **server-only**. Never use `NEXT_PUBLIC_` for Meta tokens.

After changing any Meta token or Page ID in Vercel, **redeploy Production** so the running app loads the new values.

---

## Required for Platform Analytics (Meta sync)

| Variable | Your Vercel | Purpose |
|----------|-------------|---------|
| `META_GRAPH_API_VERSION` | Set | Graph API version (e.g. `v25.0`) |
| `META_CRON_SECRET` | Set | Secures `/api/meta/cron` scheduled sync |
| `BETTER_AUTH_URL` | Set (Production + Preview) | Must match deployed site URL |
| `DATABASE_URL` | Set | PostgreSQL |

### Per brand (repeat for each Facebook Page)

| Variable | Example prefix |
|----------|----------------|
| `{BRAND}_META_ENABLED` | `true` only (case-insensitive) |
| `{BRAND}_META_PAGE_ID` | Numeric Facebook Page ID |
| `{BRAND}_META_PAGE_ACCESS_TOKEN` | Long-lived **Page** access token |

**Your enabled brands (from Vercel):**

- `NEON_NIGHTS_META_*`
- `AL_QAYSAR_META_*`
- `PRO_GROUP_META_*`

Optional (webhooks only): `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`

Do **not** set `META_FACEBOOK_PAGES_CONFIG` unless you know you need JSON config — per-brand env vars are preferred and take priority.

---

## Example `.env.local`

```env
DATABASE_URL="<your-neon-connection-string>"

BETTER_AUTH_SECRET="<your-better-auth-secret>"
BETTER_AUTH_URL="http://localhost:3000"

META_GRAPH_API_VERSION=v25.0
META_CRON_SECRET="<random-32+-chars>"

NEON_NIGHTS_META_ENABLED=true
NEON_NIGHTS_META_PAGE_ID="<facebook-page-id>"
NEON_NIGHTS_META_PAGE_ACCESS_TOKEN="<page-access-token>"

AL_QAYSAR_META_ENABLED=true
AL_QAYSAR_META_PAGE_ID="<facebook-page-id>"
AL_QAYSAR_META_PAGE_ACCESS_TOKEN="<page-access-token>"

PRO_GROUP_META_ENABLED=true
PRO_GROUP_META_PAGE_ID="<facebook-page-id>"
PRO_GROUP_META_PAGE_ACCESS_TOKEN="<page-access-token>"
```

---

## How the app reads env (Meta docs aligned)

1. Discovers every `*_META_PAGE_ID` in the environment.
2. For each prefix (e.g. `AL_QAYSAR`), requires matching `*_META_PAGE_ACCESS_TOKEN`.
3. Syncs only when `*_META_ENABLED=true` **and** Page ID + token are non-empty.
4. Uses [Graph API](https://developers.facebook.com/docs/graph-api) with the Page token:
   - `GET /{page-id}?fields=id,name,fan_count,followers_count` — page summary
   - `GET /{page-id}/posts` — posts (`pages_read_engagement`)
   - `GET /{page-id}/insights` — metrics (`read_insights`)

### Token types (Meta Developer documentation)

**Recommended:** Long-lived **Page** access token from:

```http
GET /me/accounts?fields=id,name,access_token
```

Use the `access_token` for the Page that matches `*_META_PAGE_ID`.

**Also supported:** User token with `pages_show_list` — the app resolves the Page token via `/me/accounts` automatically.

**Not valid for sync:** Short-lived Graph API Explorer session tokens after logout, or a Page token for a different Page ID.

---

## Validation rules

| Page state | Page ID | Page access token |
|------------|---------|-------------------|
| `*_META_ENABLED=true` | Required | Required |
| `*_META_ENABLED=false` | Ignored | Ignored |

---

## Scheduled sync (cron)

Uses the same env vars as the dashboard **Sync Meta** button.

```bash
curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=daily_page"

curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=hourly_posts"

curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=daily_insights"
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “session is invalid / user logged out” | New Page token in Vercel → **Redeploy** |
| Only one brand syncs | Each brand needs its **own** token for **its** Page ID |
| Page ID mismatch | `*_META_PAGE_ID` must match the Page from `/me/accounts` |
| `daily_*=0` for all brands | Tokens invalid or not loaded — redeploy after env change |
| Enabled but no data | Confirm `*_META_ENABLED=true` (not `True` with wrong spelling — `true` is fine, case-insensitive) |

Code reference: `lib/meta/pages-config.ts` → `getConfiguredMetaPages()`
