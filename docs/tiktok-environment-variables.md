# TikTok integration environment variables

Configure these in Vercel (or `.env.local`) for brand-level TikTok analytics in Platform Analytics.

## Required

| Variable | Description |
|----------|-------------|
| `TIKTOK_CLIENT_KEY` | TikTok app client key (Login Kit) |
| `TIKTOK_CLIENT_SECRET` | TikTok app client secret |
| `BETTER_AUTH_URL` | Public app URL used to build OAuth redirect |
| `DATABASE_URL` | PostgreSQL connection string |

## Recommended

| Variable | Description |
|----------|-------------|
| `TIKTOK_REDIRECT_URI` | Override redirect URI. Default: `{BETTER_AUTH_URL}/api/integrations/tiktok/callback` |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | 32-byte key (base64 or utf8) for encrypting OAuth tokens at rest. Falls back to a SHA-256 hash of `BETTER_AUTH_SECRET` if unset. |
| `META_CRON_SECRET` | Shared secret for `/api/integrations/tiktok/cron` (also accepts `TIKTOK_CRON_SECRET`) |

## TikTok developer portal

1. Enable **Login Kit** for your app.
2. Add redirect URI: `https://<your-domain>/api/integrations/tiktok/callback`
3. Request scopes: `user.info.basic`, `user.info.stats`, `video.list`
4. Submit app for review if required for production metrics.

## Scheduled sync

Call daily (Vercel Cron example):

```txt
GET /api/integrations/tiktok/cron?secret=<META_CRON_SECRET>
```

Header alternative: `x-meta-cron-secret: <META_CRON_SECRET>`

## Notes

- TikTok Ads (`tiktok_ads_snapshots`) is not implemented until Business API advertiser access is approved.
- Metrics unavailable from the API display **No live data yet** in the dashboard (not fake zeros).
