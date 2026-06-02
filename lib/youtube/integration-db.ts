import "server-only";

import { query } from "@/lib/db";

export type YouTubeIntegrationRow = {
  id: number;
  channel_key: string | null;
  external_account_id: string | null;
  account_name: string | null;
  token_reference: string | null;
  status: string;
  last_synced_at: string | null;
};

function isMissingColumnError(error: unknown, column: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  const pgError = error as { code?: string; message?: string };
  return (
    pgError.code === "42703" &&
    Boolean(pgError.message?.toLowerCase().includes(column.toLowerCase()))
  );
}

export async function listYouTubeIntegrations(): Promise<YouTubeIntegrationRow[]> {
  try {
    const result = await query<YouTubeIntegrationRow>(
      `
      SELECT
        id,
        channel_key,
        external_account_id,
        account_name,
        token_reference,
        status,
        last_synced_at
      FROM platform_integration
      WHERE platform = 'YOUTUBE'
        AND status IN ('ACTIVE', 'ERROR')
      ORDER BY updated_at DESC
      `,
      [],
    );

    return result.rows;
  } catch (error) {
    if (!isMissingColumnError(error, "channel_key")) {
      throw error;
    }

    const legacy = await query<Omit<YouTubeIntegrationRow, "channel_key">>(
      `
      SELECT
        id,
        external_account_id,
        account_name,
        token_reference,
        status,
        last_synced_at
      FROM platform_integration
      WHERE platform = 'YOUTUBE'
        AND status IN ('ACTIVE', 'ERROR')
      ORDER BY updated_at DESC
      `,
      [],
    );

    return legacy.rows.map((row) => ({
      ...row,
      channel_key: null,
    }));
  }
}

export async function listYouTubeIntegrationsMap() {
  const rows = await listYouTubeIntegrations();
  const byChannelKey = new Map<string, YouTubeIntegrationRow>();
  const byExternalId = new Map<string, YouTubeIntegrationRow>();

  for (const row of rows) {
    if (row.channel_key) {
      byChannelKey.set(row.channel_key, row);
    }
    if (row.external_account_id) {
      byExternalId.set(row.external_account_id, row);
    }
  }

  return { rows, byChannelKey, byExternalId };
}
