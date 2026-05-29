import "server-only";

import { query } from "@/lib/db";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/token-crypto";
import { refreshTikTokAccessToken } from "@/lib/tiktok/oauth";

export type SocialIntegrationRow = {
  id: number;
  brand_id: number;
  provider: "TIKTOK";
  account_id: string;
  account_name: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  scopes: string[];
  expires_at: string | null;
  status: "ACTIVE" | "ERROR" | "RECONNECT_REQUIRED" | "DISCONNECTED";
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialIntegrationWithTokens = SocialIntegrationRow & {
  accessToken: string;
  refreshToken: string | null;
};

function mapIntegrationRow(row: SocialIntegrationRow): SocialIntegrationWithTokens {
  return {
    ...row,
    accessToken: decryptIntegrationToken(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted
      ? decryptIntegrationToken(row.refresh_token_encrypted)
      : null,
  };
}

export async function getTikTokIntegrationByBrandId(
  brandId: number,
): Promise<SocialIntegrationWithTokens | null> {
  const result = await query<SocialIntegrationRow>(
    `
    SELECT
      id,
      brand_id,
      provider,
      account_id,
      account_name,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      expires_at,
      status,
      last_sync_at,
      last_error,
      created_at,
      updated_at
    FROM social_integrations
    WHERE brand_id = $1
      AND provider = 'TIKTOK'
      AND status IN ('ACTIVE', 'ERROR', 'RECONNECT_REQUIRED')
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [brandId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapIntegrationRow(row);
}

export async function listActiveTikTokIntegrations(): Promise<
  SocialIntegrationWithTokens[]
> {
  const result = await query<SocialIntegrationRow>(
    `
    SELECT
      id,
      brand_id,
      provider,
      account_id,
      account_name,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      expires_at,
      status,
      last_sync_at,
      last_error,
      created_at,
      updated_at
    FROM social_integrations
    WHERE provider = 'TIKTOK'
      AND status = 'ACTIVE'
    ORDER BY brand_id ASC
    `,
  );

  return result.rows.map(mapIntegrationRow);
}

export async function upsertTikTokIntegration(input: {
  brandId: number;
  openId: string;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: Date | null;
}) {
  await query(
    `
    INSERT INTO social_integrations (
      brand_id,
      provider,
      account_id,
      account_name,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      expires_at,
      status,
      last_error,
      updated_at
    )
    VALUES (
      $1,
      'TIKTOK',
      $2,
      $3,
      $4,
      $5,
      $6::text[],
      $7,
      'ACTIVE',
      NULL,
      now()
    )
    ON CONFLICT (brand_id, provider, account_id)
    DO UPDATE SET
      account_name = EXCLUDED.account_name,
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = COALESCE(
        EXCLUDED.refresh_token_encrypted,
        social_integrations.refresh_token_encrypted
      ),
      scopes = EXCLUDED.scopes,
      expires_at = EXCLUDED.expires_at,
      status = 'ACTIVE',
      last_error = NULL,
      updated_at = now()
    `,
    [
      input.brandId,
      input.openId,
      input.accountName,
      encryptIntegrationToken(input.accessToken),
      input.refreshToken
        ? encryptIntegrationToken(input.refreshToken)
        : null,
      input.scopes,
      input.expiresAt,
    ],
  );
}

export async function markTikTokIntegrationReconnectRequired(
  integrationId: number,
  errorMessage: string,
) {
  await query(
    `
    UPDATE social_integrations
    SET
      status = 'RECONNECT_REQUIRED',
      last_error = $2,
      updated_at = now()
    WHERE id = $1
    `,
    [integrationId, errorMessage.slice(0, 2000)],
  );
}

export async function markTikTokIntegrationError(
  integrationId: number,
  errorMessage: string,
) {
  await query(
    `
    UPDATE social_integrations
    SET
      status = 'ERROR',
      last_error = $2,
      updated_at = now()
    WHERE id = $1
    `,
    [integrationId, errorMessage.slice(0, 2000)],
  );
}

export async function disconnectTikTokIntegration(brandId: number) {
  await query(
    `
    UPDATE social_integrations
    SET
      status = 'DISCONNECTED',
      access_token_encrypted = $2,
      refresh_token_encrypted = NULL,
      last_error = NULL,
      updated_at = now()
    WHERE brand_id = $1
      AND provider = 'TIKTOK'
      AND status IN ('ACTIVE', 'ERROR', 'RECONNECT_REQUIRED')
    `,
    [brandId, encryptIntegrationToken("")],
  );
}

export async function updateTikTokIntegrationTokens(
  integrationId: number,
  input: {
    accessToken: string;
    refreshToken: string | null;
    scopes: string[];
    expiresAt: Date | null;
  },
) {
  await query(
    `
    UPDATE social_integrations
    SET
      access_token_encrypted = $2,
      refresh_token_encrypted = COALESCE($3, refresh_token_encrypted),
      scopes = $4::text[],
      expires_at = $5,
      status = 'ACTIVE',
      last_error = NULL,
      updated_at = now()
    WHERE id = $1
    `,
    [
      integrationId,
      encryptIntegrationToken(input.accessToken),
      input.refreshToken
        ? encryptIntegrationToken(input.refreshToken)
        : null,
      input.scopes,
      input.expiresAt,
    ],
  );
}

export async function updateTikTokIntegrationSyncSuccess(integrationId: number) {
  await query(
    `
    UPDATE social_integrations
    SET
      last_sync_at = now(),
      last_error = NULL,
      status = 'ACTIVE',
      updated_at = now()
    WHERE id = $1
    `,
    [integrationId],
  );
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function ensureTikTokAccessToken(
  integration: SocialIntegrationWithTokens,
): Promise<string> {
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : null;

  const needsRefresh =
    expiresAt != null && expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    await markTikTokIntegrationReconnectRequired(
      integration.id,
      "Access token expired and no refresh token is available.",
    );
    throw new Error("TikTok reconnect required.");
  }

  try {
    const refreshed = await refreshTikTokAccessToken(integration.refreshToken);
    await updateTikTokIntegrationTokens(integration.id, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      scopes:
        refreshed.scopes.length > 0 ? refreshed.scopes : integration.scopes,
      expiresAt: refreshed.expiresAt,
    });
    return refreshed.accessToken;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok token refresh failed.";
    await markTikTokIntegrationReconnectRequired(integration.id, message);
    throw new Error("TikTok reconnect required.");
  }
}

export async function logTikTokSync(input: {
  brandId: number;
  integrationId: number;
  syncType: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  recordsSynced: number;
  errorMessage?: string | null;
}) {
  await query(
    `
    INSERT INTO platform_sync_log (
      platform,
      sync_type,
      external_account_id,
      status,
      started_at,
      finished_at,
      records_synced,
      error_message
    )
    VALUES (
      'TIKTOK',
      $1,
      $2,
      $3,
      now(),
      now(),
      $4,
      $5
    )
    `,
    [
      input.syncType,
      String(input.integrationId),
      input.status,
      input.recordsSynced,
      input.errorMessage ?? null,
    ],
  );
}

export async function saveTikTokOAuthConnection(input: {
  brandId: number;
  openId: string;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: Date | null;
}) {
  await query(
    `
    UPDATE social_integrations
    SET status = 'DISCONNECTED', updated_at = now()
    WHERE brand_id = $1
      AND provider = 'TIKTOK'
      AND account_id <> $2
      AND status IN ('ACTIVE', 'ERROR', 'RECONNECT_REQUIRED')
    `,
    [input.brandId, input.openId],
  );

  await upsertTikTokIntegration(input);
}
