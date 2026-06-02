import "server-only";

import { query } from "@/lib/db";
import {
  YOUTUBE_ANALYTICS_SCOPE,
  YOUTUBE_READONLY_SCOPE,
} from "@/lib/platform-analytics/youtube-client";
import {
  getConfiguredYouTubeChannels,
  getEnabledYouTubeChannels,
  type YouTubeChannelConfig,
} from "@/lib/youtube/channels-config";

async function upsertYouTubeIntegrationFromEnv(
  channel: YouTubeChannelConfig,
  createdByProfileId: number | null,
) {
  const scopes = [YOUTUBE_ANALYTICS_SCOPE, YOUTUBE_READONLY_SCOPE];

  try {
    await query(
      `
      INSERT INTO platform_integration (
        platform,
        account_name,
        account_type,
        external_account_id,
        channel_key,
        token_reference,
        scopes,
        status,
        created_by,
        updated_at
      )
      VALUES (
        'YOUTUBE',
        $1,
        'youtube_channel',
        $2,
        $3,
        $4,
        $5::text[],
        'ACTIVE',
        $6,
        now()
      )
      ON CONFLICT (platform, external_account_id, account_type)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        channel_key = COALESCE(EXCLUDED.channel_key, platform_integration.channel_key),
        token_reference = COALESCE(EXCLUDED.token_reference, platform_integration.token_reference),
        scopes = EXCLUDED.scopes,
        status = 'ACTIVE',
        updated_at = now()
      `,
      [
        channel.displayName,
        channel.channelId,
        channel.key,
        channel.refreshToken,
        scopes,
        createdByProfileId,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.toLowerCase().includes("channel_key")) {
      throw error;
    }

    await query(
      `
      INSERT INTO platform_integration (
        platform,
        account_name,
        account_type,
        external_account_id,
        token_reference,
        scopes,
        status,
        created_by,
        updated_at
      )
      VALUES (
        'YOUTUBE',
        $1,
        'youtube_channel',
        $2,
        $3,
        $4::text[],
        'ACTIVE',
        $5,
        now()
      )
      ON CONFLICT (platform, external_account_id, account_type)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        token_reference = COALESCE(EXCLUDED.token_reference, platform_integration.token_reference),
        scopes = EXCLUDED.scopes,
        status = 'ACTIVE',
        updated_at = now()
      `,
      [
        channel.displayName,
        channel.channelId,
        channel.refreshToken,
        scopes,
        createdByProfileId,
      ],
    );
  }
}

export type YouTubeBootstrapResult = {
  registeredCount: number;
  errors: string[];
};

/** Upsert platform_integration rows from env refresh tokens (same idea as Meta bootstrap). */
export async function registerConfiguredYouTubeChannels(
  createdByProfileId?: number | null,
): Promise<YouTubeBootstrapResult> {
  const configured = getConfiguredYouTubeChannels();
  const errors: string[] = [];
  let registeredCount = 0;

  for (const channel of configured) {
    try {
      await upsertYouTubeIntegrationFromEnv(channel, createdByProfileId ?? null);
      registeredCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "YouTube registration failed.";
      errors.push(`${channel.displayName}: ${message}`);
    }
  }

  return { registeredCount, errors };
}

export function getYouTubeIntegrationStatus() {
  const enabled = getEnabledYouTubeChannels().length;
  const configured = getConfiguredYouTubeChannels().length;

  return {
    enabledCount: enabled,
    configuredCount: configured,
    needsBootstrap: configured > 0,
  };
}
