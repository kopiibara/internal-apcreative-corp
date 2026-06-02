# YouTube environment variables (local + production)

Copy these into `.env.local` (local) and into your hosting provider (Vercel → **internal.apcreativecorp.com** → Environment Variables).

**Never commit real secrets to git.** Env files matching `.env*` are gitignored.

Refresh tokens and OAuth client secrets are **server-only**. Never use `NEXT_PUBLIC_` for YouTube tokens or secrets.

After changing any YouTube token or channel ID in Vercel, **redeploy Production** so the running app loads the new values.

---

## Shared OAuth credentials (once)

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_CLIENT_ID` | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth client secret |
| `YOUTUBE_REDIRECT_URI` | OAuth redirect URI (must match Google Cloud Console) |

Legacy aliases still supported: `NEXT_PUBLIC_YOUTUBE_CLIENT_ID`, `YOUTUBE_OAUTH_REDIRECT_URI`.

---

## Per channel (repeat for each YouTube channel)

| Variable | Example prefix |
|----------|----------------|
| `{BRAND}_YOUTUBE_ENABLED` | `true` only (case-insensitive) |
| `{BRAND}_YOUTUBE_CHANNEL_ID` | YouTube channel ID |
| `{BRAND}_YOUTUBE_CHANNEL_NAME` | Display name in Platform Analytics selector |
| `{BRAND}_YOUTUBE_REFRESH_TOKEN` | Long-lived refresh token (server-only) |

**Configured channels (from product spec):**

- `AP_CREATIVE_YOUTUBE_*` → AP Creative Corp.
- `PRO_GROUP_YOUTUBE_*` → Pro Group
- `AL_QAYSAR_YOUTUBE_*` → Al Qaysar
- `NEON_NIGHTS_YOUTUBE_*` → Neon Nights
- `OCULTO_YOUTUBE_*` → Oculto

A channel appears in **Platform Analytics → YouTube → Selected channel** only when:

1. `{BRAND}_YOUTUBE_ENABLED=true`
2. `{BRAND}_YOUTUBE_CHANNEL_ID` is set
3. `{BRAND}_YOUTUBE_REFRESH_TOKEN` is set **or** the channel was connected via **Connect YouTube** OAuth in the dashboard

---

## Example `.env.local`

```env
YOUTUBE_CLIENT_ID="<google-oauth-client-id>"
YOUTUBE_CLIENT_SECRET="<google-oauth-client-secret>"
YOUTUBE_REDIRECT_URI="http://localhost:3000/api/platform-analytics/youtube/callback"

AP_CREATIVE_YOUTUBE_ENABLED=true
AP_CREATIVE_YOUTUBE_CHANNEL_ID="<youtube-channel-id>"
AP_CREATIVE_YOUTUBE_CHANNEL_NAME="AP Creative Corp."
AP_CREATIVE_YOUTUBE_REFRESH_TOKEN="<refresh-token>"

PRO_GROUP_YOUTUBE_ENABLED=true
PRO_GROUP_YOUTUBE_CHANNEL_ID="<youtube-channel-id>"
PRO_GROUP_YOUTUBE_CHANNEL_NAME="Pro Group"
PRO_GROUP_YOUTUBE_REFRESH_TOKEN="<refresh-token>"
```

---

## How the app reads env (Meta-style)

1. Discovers every `*_YOUTUBE_ENABLED` and `*_YOUTUBE_CHANNEL_ID` in the environment.
2. For each prefix (e.g. `PRO_GROUP`), requires `*_YOUTUBE_ENABLED=true` and a non-empty channel ID.
3. Registers env refresh tokens into `platform_integration` on dashboard load (with `channel_key` when migration `068_youtube_channel_key.sql` is applied).
4. **Selected channel** in the UI filters analytics client-side from `youtubeChannelAnalytics[]`, same pattern as Meta **Sync target**.
5. **All enabled channels** combines KPIs, charts, and video tables from all connected channels.

### Connect YouTube (dashboard)

When a channel has no env refresh token, use **Connect YouTube** with that channel selected. OAuth stores the token server-side for that `channel_key` — never exposed to the browser.

---

## Database migration

Run `db/migrations/068_youtube_channel_key.sql` on production before deploying multi-channel YouTube analytics. The app includes fallbacks if the column is missing, but full per-channel sync and OAuth assignment require the migration.
