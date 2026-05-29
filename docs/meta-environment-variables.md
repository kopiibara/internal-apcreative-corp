# Environment variables (local + production)

Copy these into `.env.local` (local) and into your hosting provider (Vercel → **internal.apcreativecorp.com** → Environment Variables).

**Never commit real secrets to git.** Env files matching `.env*` are gitignored.

Page access tokens are **server-only**. Never use `NEXT_PUBLIC_` for Meta tokens.

---

## Local development (`.env.local`)

```env
DATABASE_URL="<your-neon-connection-string>"

BETTER_AUTH_SECRET="<your-existing-better-auth-secret>"
BETTER_AUTH_URL="http://localhost:3000"

# ==========================================
# META APP CONFIGURATION
# ==========================================

META_GRAPH_API_VERSION=v25.0
META_APP_ID=
META_APP_SECRET=

META_CRON_SECRET="<generate-a-long-random-string>"

# Optional — only if Meta Webhooks are enabled
META_WEBHOOK_VERIFY_TOKEN="apcreative_meta_webhook_2026"


# ==========================================
# META FACEBOOK PAGES
# ==========================================

# Active: Neon Nights
NEON_NIGHTS_META_ENABLED=true
NEON_NIGHTS_META_PAGE_ID="<facebook-page-id>"
NEON_NIGHTS_META_PAGE_ACCESS_TOKEN="<long-lived-page-access-token>"


# Reserved: Pro Group (do not enable until ready)
PRO_GROUP_META_ENABLED=false
PRO_GROUP_META_PAGE_ID=
PRO_GROUP_META_PAGE_ACCESS_TOKEN=


# Reserved: Al Qaysar (do not enable until ready)
AL_QAYSAR_META_ENABLED=false
AL_QAYSAR_META_PAGE_ID=
AL_QAYSAR_META_PAGE_ACCESS_TOKEN=
```

---

## Production (Vercel / host)

Use the same structure as local. Set `BETTER_AUTH_URL` to your production URL.

---

## Validation rules

| Page state | Page ID | Page access token |
|------------|---------|-------------------|
| `*_META_ENABLED=true` | Required | Required |
| `*_META_ENABLED=false` | Optional (empty OK) | Optional (empty OK) |

Only enabled pages are validated, registered, and synced. Disabled reserved pages never call the Meta API.

---

## Activating a reserved page later

1. Set `PRO_GROUP_META_ENABLED=true` or `AL_QAYSAR_META_ENABLED=true`
2. Add that page’s `*_META_PAGE_ID` and `*_META_PAGE_ACCESS_TOKEN`
3. Redeploy / restart the app
4. Run cron sync or use **Connect & sync** in Platform Analytics

No code changes are required.

---

## Where to get each Meta value

| Variable | Where to get it |
|----------|-----------------|
| `META_GRAPH_API_VERSION` | Meta Graph API version (e.g. `v25.0`) |
| `META_APP_ID` | Meta Developer App → Settings → Basic |
| `META_APP_SECRET` | Meta Developer App → Settings → Basic → App secret |
| `META_CRON_SECRET` | Generate yourself (32+ random characters). Used by `/api/meta/cron` |
| `META_WEBHOOK_VERIFY_TOKEN` | You choose this; must match Meta → Webhooks → Verify token |
| `NEON_NIGHTS_META_PAGE_ID` | Facebook Page → About → Page ID |
| `NEON_NIGHTS_META_PAGE_ACCESS_TOKEN` | Graph API Explorer or long-lived Page token with `pages_read_engagement`, `read_insights`, etc. |

---

## Scheduled sync (cron)

Sync jobs only loop through pages where `*_META_ENABLED=true` and credentials are set.
Each job is independent — one failure does not stop the others.

| Job | Purpose |
|-----|---------|
| `daily_page` | Page name, likes (`fan_count`), followers |
| `hourly_posts` | Posts with reactions, comments, shares |
| `daily_insights` | Reach, impressions, engagements (`read_insights`) |

```bash
curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=daily_page"

curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=hourly_posts"

curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=daily_insights"
```

You may set **either**:

1. **Page access token** — from `/me/accounts?fields=id,name,access_token` for Neon Nights (recommended), or  
2. **User access token** — from Graph API Explorer with `pages_show_list` + `pages_read_engagement` + `read_insights`; the server resolves the Page token via `/me/accounts` automatically.

Do not use a User token without `pages_show_list` — posts and insights will fail with error #10.

---

## Code reference

Central page config: `lib/meta/pages-config.ts`

Per-brand env vars (`AL_QAYSAR_META_*`, `PRO_GROUP_META_*`, etc.) are used first when present.  
If `META_FACEBOOK_PAGES_CONFIG` JSON is also set, it is **ignored** whenever those env vars exist — so Vercel updates to `AL_QAYSAR_META_PAGE_ID` / token are not overridden by stale JSON.

Active pages: `getConfiguredMetaPages()` → every brand with `*_META_ENABLED=true` and both Page ID + Page access token set.
