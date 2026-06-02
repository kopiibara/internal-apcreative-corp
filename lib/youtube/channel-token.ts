import "server-only";

import type { YouTubeChannelConfig } from "@/lib/youtube/channels-config";
import type { YouTubeIntegrationRow } from "@/lib/youtube/integration-db";

export function resolveYouTubeChannelRefreshToken(
  config: YouTubeChannelConfig,
  integration: YouTubeIntegrationRow | null,
): string | null {
  if (config.refreshToken) {
    return config.refreshToken;
  }

  return integration?.token_reference ?? null;
}

export function hasYouTubeChannelCredentials(
  config: YouTubeChannelConfig,
  integration: YouTubeIntegrationRow | null,
) {
  return Boolean(resolveYouTubeChannelRefreshToken(config, integration));
}
