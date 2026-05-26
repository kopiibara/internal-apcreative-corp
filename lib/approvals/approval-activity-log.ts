import "server-only";

import type { PoolClient } from "pg";

export async function insertApprovalActivityLog({
  client,
  reportId,
  actorProfileId,
  action,
  fromStatus,
  toStatus,
  notes,
  metadata,
}: {
  client: PoolClient;
  reportId: number;
  actorProfileId: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string;
  metadata?: Record<string, unknown>;
}) {
  await client.query(
    `
    INSERT INTO approval_activity_log (
      content_report_id,
      actor_profile_id,
      action,
      from_status,
      to_status,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      reportId,
      actorProfileId,
      action,
      fromStatus,
      toStatus,
      notes,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}
