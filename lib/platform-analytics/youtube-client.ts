import "server-only";

import { google } from "googleapis";

export const YOUTUBE_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/yt-analytics.readonly";
export const YOUTUBE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/youtube.readonly";

export const YOUTUBE_OAUTH_SCOPES = [
  YOUTUBE_ANALYTICS_SCOPE,
  YOUTUBE_READONLY_SCOPE,
] as const;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function appBaseUrl() {
  const fromEnv = process.env.BETTER_AUTH_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}

export function getYouTubeOAuthRedirectUri() {
  const explicit = process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit;
  }
  return `${appBaseUrl()}/api/platform-analytics/youtube/callback`;
}

export function createYouTubeOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv("NEXT_PUBLIC_YOUTUBE_CLIENT_ID"),
    requiredEnv("YOUTUBE_CLIENT_SECRET"),
    getYouTubeOAuthRedirectUri(),
  );
}

export function buildYouTubeOAuthUrl(state: string) {
  const oauth = createYouTubeOAuthClient();

  return oauth.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    response_type: "code",
    scope: [...YOUTUBE_OAUTH_SCOPES],
    state,
  });
}
