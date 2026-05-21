# Environment variables (local + production)

Copy these into `.env` (local) and into your hosting provider (Vercel → **internal.apcreativecorp.com** → Environment Variables).

**Never commit real secrets to git.** Use `.env` locally only.

---

## Local development (`.env`)

```env
DATABASE_URL="<your-neon-connection-string>"

BETTER_AUTH_SECRET="<your-existing-better-auth-secret>"
BETTER_AUTH_URL="http://localhost:3000"

META_WEBHOOK_VERIFY_TOKEN="apcreative_meta_webhook_2026"
META_APP_SECRET="<from Meta App → Settings → Basic → App secret>"
META_PAGE_ACCESS_TOKEN="<from Meta Graph API Explorer or Page token tool>"
META_CRON_SECRET="<generate-a-long-random-string>"
META_GRAPH_API_VERSION="v22.0"

INITIAL_EXECUTIVE_EMAIL="admin@admin.com"
INITIAL_EXECUTIVE_PASSWORD="admin123!"
INITIAL_EXECUTIVE_NAME="WEBDEVELOPER"
INITIAL_ROLE="FULL STACK DEVELOPER"
DEFAULT_TEMPORARY_PASSWORD="apcreativemarketing123!"
```

---

## Production (Vercel / host for internal.apcreativecorp.com)

Use the **same** `DATABASE_URL` and `BETTER_AUTH_SECRET` as your live app (do not change unless rotating secrets).

```env
DATABASE_URL="<same Neon URL as production already uses>"

BETTER_AUTH_SECRET="<same secret as production already uses>"
BETTER_AUTH_URL="https://internal.apcreativecorp.com"

META_WEBHOOK_VERIFY_TOKEN="apcreative_meta_webhook_2026"
META_APP_SECRET="<from Meta App → Settings → Basic → App secret>"
META_PAGE_ACCESS_TOKEN="<long-lived Page access token>"
META_CRON_SECRET="<same random string you use for cron curl>"
META_GRAPH_API_VERSION="v22.0"
```

---

## Where to get each Meta value

| Variable | Where to get it |
|----------|-----------------|
| `META_WEBHOOK_VERIFY_TOKEN` | You choose this. Must match Meta → Webhooks → Verify token. Use: `apcreative_meta_webhook_2026` |
| `META_APP_SECRET` | [developers.facebook.com](https://developers.facebook.com) → **AP Creative Social Monitoring** → **App settings** → **Basic** → **App secret** → Show |
| `META_PAGE_ACCESS_TOKEN` | Graph API Explorer, or token exchange from User token with Page permissions. Must include `pages_read_engagement`, `read_insights`, etc. |
| `META_CRON_SECRET` | Generate yourself (32+ random characters). Used only by `/api/meta/cron` |

---

## Optional: per-Page token env keys

If you register a page with a custom env key in `meta_facebook_page.access_token_env_key`:

```env
META_PAGE_ACCESS_TOKEN_PRO_GROUP="<page-specific-token>"
```

---

## After setting variables

1. Redeploy production (so routes + env load).
2. Test: `https://internal.apcreativecorp.com/api/meta/webhook?hub.mode=subscribe&hub.verify_token=apcreative_meta_webhook_2026&hub.challenge=test123` → body must be `test123`.
3. Meta Dashboard → **Verify and save** on the same callback URL.
