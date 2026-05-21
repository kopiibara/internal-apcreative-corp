# Meta / Facebook Page Monitoring

## Overview

The internal dashboard receives real-time Facebook Page activity through Meta webhooks and stores scheduled analytics from the Graph API / Insights API.

- **Webhooks**: comments, reactions, feed updates, mentions, messages, leads (by subscribed field)
- **Graph API sync**: followers, post totals, engagement rankings, daily snapshots

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/meta/webhook` | GET | Meta webhook verification |
| `/api/meta/webhook` | POST | Receive signed webhook payloads |
| `/api/meta/cron?job=hourly_posts` | GET/POST | Sync recent post metrics (cron secret required) |
| `/api/meta/cron?job=daily_page` | GET/POST | Daily follower / Page snapshot |
| `/api/meta/cron?job=process_webhooks` | GET/POST | Process unprocessed webhook rows |

## Environment Variables

Add to production (never expose in client code):

```env
META_WEBHOOK_VERIFY_TOKEN=apcreative_meta_webhook_2026
META_APP_SECRET=<meta_app_secret>
META_PAGE_ACCESS_TOKEN=<page_access_token>
META_CRON_SECRET=<long_random_secret>

# Optional
META_GRAPH_API_VERSION=v22.0
META_PAGE_ACCESS_TOKEN_<PAGE_ALIAS>=<token for specific page>
```

Per-page tokens: register the page with `access_token_env_key` set to the env variable name (for example `META_PAGE_ACCESS_TOKEN_PRO_GROUP`).

## Meta Developer Dashboard

**App**: AP Creative Social Monitoring

1. **Webhooks** → Object: **Page**
2. **Callback URL**: `https://internal.apcreativecorp.com/api/meta/webhook`
3. **Verify token**: must match `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to **`feed`** first; add `messages`, `mention`, `leadgen`, `ratings` when needed.
5. Keep the app in **Development** until testing is complete.

### Required permissions (testing)

- `pages_manage_metadata`
- `pages_manage_engagement`
- `pages_read_engagement`
- `pages_read_user_content`
- `pages_show_list`
- `read_insights`
- `business_management`

## Database

Migration: `db/migrations/020_meta_facebook_monitoring.sql`

Tables:

- `meta_facebook_page` — connected Pages
- `meta_webhook_event` — raw webhook audit log
- `meta_page_daily_snapshot` — daily follower / Page totals
- `meta_post_metrics` — post engagement from Graph API
- `meta_sync_run` — sync job history

Run migrations:

```bash
npm run db:migrate
```

Register a Page:

```bash
npx tsx scripts/meta-register-page.ts <facebook_page_id> "Pro Group E-Bike & Scooter"
```

## Dashboard

**Admin** → **Platform Analytics** (`/admin/platform-analytics`)

Requires permission `meta_monitoring.view`. Manual sync buttons require `meta_monitoring.manage`.

## Scheduled Jobs

Call from your host cron or scheduler (HTTPS):

```bash
# Hourly — recent post engagement
curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=hourly_posts"

# Daily — followers and Page totals
curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=daily_page"

# Optional — drain unprocessed webhooks
curl -H "x-meta-cron-secret: $META_CRON_SECRET" \
  "https://internal.apcreativecorp.com/api/meta/cron?job=process_webhooks"
```

Recommended:

- **Hourly**: `hourly_posts`
- **Daily**: `daily_page`
- **Weekly/Monthly**: `weekly_summary` / `monthly_summary` (currently extends daily snapshot logic)

## Production go-live checklist

Complete these on **https://internal.apcreativecorp.com** before real Meta testing:

1. [ ] Deploy the latest code that includes migration `020_meta_facebook_monitoring.sql`
2. [ ] Run `npm run db:migrate` against the **production** database (local migrate alone is not enough)
3. [ ] Set production env: `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_CRON_SECRET`
4. [ ] Confirm webhook POST validates `X-Hub-Signature-256` on the **raw request body** (before JSON parse)
5. [ ] Register the Facebook Page: `npm run meta:register-page -- <page_id> "Page Name"`
6. [ ] In Meta Developer Dashboard: verify callback URL, subscribe **Page** object, enable **`feed`**
7. [ ] Subscribe the Facebook Page to the app (Page must send events to your callback)
8. [ ] Test comment → Activity Logs shows event
9. [ ] Run cron or dashboard sync → Page Analytics and Post Performance populate (requires valid Page token)
10. [ ] Keep Meta app in **Development** until all of the above pass

**Note:** Webhooks deliver real-time events only. Follower totals, post metrics, and historical analytics require a valid **Page Access Token** plus scheduled Graph API / Page Insights sync (`hourly_posts`, `daily_page`).

## Testing Checklist

1. [ ] Meta verifies GET `/api/meta/webhook` with verify token
2. [ ] POST webhook returns 200 and saves `meta_webhook_event`
3. [ ] Invalid signature returns 403
4. [ ] Page subscribed to app in Meta dashboard
5. [ ] Comment on a Page post triggers `feed` webhook
6. [ ] Dashboard **Activity Logs** shows the event
7. [ ] `hourly_posts` sync populates `meta_post_metrics`
8. [ ] `daily_page` sync populates `meta_page_daily_snapshot`
9. [ ] Failed processing shows `error_log` on the event row

**First test**: comment on a Facebook Page post and confirm a new row in Activity Logs.

## Connected Pages (configure in DB)

Prepare Pages such as:

- Pro Group E-Bike & Scooter
- Neon Nights
- Oculto
- Fyre
- Al Qaysar

The first production Page depends on which brand you connect first.

## Active Webhook Fields

Start with: **`feed`**

Optional later: `messages`, `mention`, `leadgen`, `ratings`

Update `meta_facebook_page.webhook_subscribed_fields` when expanding subscriptions.

## Security Notes

- Webhook POST payloads are validated with `X-Hub-Signature-256` (HMAC SHA-256 + app secret).
- Tokens and secrets are server-only environment variables.
- Webhook handler saves first, responds quickly, processes in `after()` background work.
- Do not publish the Meta app until webhook + Page subscription tests pass.
