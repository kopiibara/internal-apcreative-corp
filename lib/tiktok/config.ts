import "server-only";

export const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";

/** Scopes requested at connect time (TikTok Login Kit). */
export const TIKTOK_DEFAULT_SCOPES = [
  "user.info.basic",
  "user.info.stats",
  "video.list",
] as const;

export function getTikTokClientKey(): string {
  const key =
    process.env.TIKTOK_CLIENT_KEY?.trim() ||
    process.env.TIKTOK_CLIENT_ID?.trim();
  if (!key) {
    throw new Error("TIKTOK_CLIENT_KEY is not configured.");
  }
  return key;
}

export function getTikTokClientSecret(): string {
  const secret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("TIKTOK_CLIENT_SECRET is not configured.");
  }
  return secret;
}

export function getTikTokRedirectUri(origin: string): string {
  const configured = process.env.TIKTOK_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return `${origin.replace(/\/$/, "")}/api/integrations/tiktok/callback`;
}

export function isTikTokOAuthConfigured(): boolean {
  return Boolean(
    (process.env.TIKTOK_CLIENT_KEY?.trim() ||
      process.env.TIKTOK_CLIENT_ID?.trim()) &&
      process.env.TIKTOK_CLIENT_SECRET?.trim(),
  );
}

export function getTikTokCronSecret(): string | null {
  return (
    process.env.TIKTOK_CRON_SECRET?.trim() ||
    process.env.META_CRON_SECRET?.trim() ||
    null
  );
}
