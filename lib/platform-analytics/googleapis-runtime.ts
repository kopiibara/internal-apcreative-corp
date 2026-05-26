import "server-only"

/**
 * Runtime bridge to googleapis without pulling its full .d.ts tree into
 * `next build` TypeScript (avoids heap OOM on typical Node memory limits).
 */
export type YouTubeOAuth2Client = {
  credentials: Record<string, unknown>
  generateAuthUrl(options: Record<string, unknown>): string
  getToken(code: string): Promise<{ tokens: Record<string, unknown> }>
  setCredentials(tokens: Record<string, unknown>): void
}

export type YouTubeApiClient = {
  channels: {
    list(
      params: Record<string, unknown>
    ): Promise<{ data: Record<string, unknown> }>
  }
  videos: {
    list(
      params: Record<string, unknown>
    ): Promise<{ data: Record<string, unknown> }>
  }
}

export type YouTubeAnalyticsClient = {
  reports: {
    query(
      params: Record<string, unknown>
    ): Promise<{ data: Record<string, unknown> }>
  }
}

type GoogleSdk = {
  auth: {
    OAuth2: new (
      clientId: string,
      clientSecret: string,
      redirectUri: string
    ) => YouTubeOAuth2Client
  }
  youtube: (options: {
    version: string
    auth: YouTubeOAuth2Client
  }) => YouTubeApiClient
  youtubeAnalytics: (options: {
    version: string
    auth: YouTubeOAuth2Client
  }) => YouTubeAnalyticsClient
}

function loadGoogleSdk(): GoogleSdk {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("googleapis") as { google: GoogleSdk }
  return module.google
}

export const google = loadGoogleSdk()
