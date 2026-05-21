import "server-only"

import { query } from "@/lib/db"
import { parseMetaWebhookPayload } from "@/lib/meta/webhook-parser"
import type {
  MetaWebhookEventRow,
  MetaWebhookPayload,
  MetaWebhookProcessingStatus,
} from "@/lib/meta/types"

export async function saveMetaWebhookPayload(payload: MetaWebhookPayload) {
  const parsedEvents = parseMetaWebhookPayload(payload)
  const insertedIds: number[] = []

  if (parsedEvents.length === 0) {
    const fallback = await query<{ id: number }>(
      `
      INSERT INTO meta_webhook_event (
        event_id,
        object_type,
        raw_payload
      )
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id
      `,
      [
        `meta_raw_${Date.now()}`,
        payload.object ?? "unknown",
        JSON.stringify(payload),
      ]
    )

    if (fallback.rows[0]?.id) {
      insertedIds.push(fallback.rows[0].id)
    }

    return insertedIds
  }

  for (const event of parsedEvents) {
    const result = await query<{ id: number }>(
      `
      INSERT INTO meta_webhook_event (
        event_id,
        object_type,
        page_id,
        field_name,
        post_id,
        comment_id,
        sender_id,
        event_type,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id
      `,
      [
        event.eventId,
        event.objectType,
        event.pageId,
        event.fieldName,
        event.postId,
        event.commentId,
        event.senderId,
        event.eventType,
        JSON.stringify(payload),
      ]
    )

    if (result.rows[0]?.id) {
      insertedIds.push(result.rows[0].id)
    }
  }

  return insertedIds
}

export async function markWebhookEventStatus(
  eventId: number,
  status: MetaWebhookProcessingStatus,
  errorLog?: string | null
) {
  await query(
    `
    UPDATE meta_webhook_event
    SET
      processing_status = $2,
      processed_at = CASE WHEN $2 IN ('PROCESSED', 'FAILED') THEN now() ELSE processed_at END,
      error_log = $3
    WHERE id = $1
    `,
    [eventId, status, errorLog ?? null]
  )
}

export async function processMetaWebhookEventById(eventDbId: number) {
  await markWebhookEventStatus(eventDbId, "PROCESSING")

  try {
    const result = await query<MetaWebhookEventRow>(
      `
      SELECT
        id,
        event_id,
        object_type,
        page_id,
        field_name,
        post_id,
        comment_id,
        sender_id,
        event_type,
        raw_payload,
        processing_status,
        received_at,
        processed_at,
        error_log
      FROM meta_webhook_event
      WHERE id = $1
      LIMIT 1
      `,
      [eventDbId]
    )

    const event = result.rows[0]
    if (!event) {
      return
    }

    if (event.page_id) {
      await query(
        `
        INSERT INTO meta_facebook_page (facebook_page_id, page_name)
        VALUES ($1, $2)
        ON CONFLICT (facebook_page_id) DO UPDATE SET
          updated_at = now()
        `,
        [event.page_id, `Facebook Page ${event.page_id}`]
      )
    }

    if (event.post_id && event.page_id) {
      await query(
        `
        INSERT INTO meta_post_metrics (
          facebook_page_id,
          post_id,
          last_synced_at,
          updated_at
        )
        VALUES ($1, $2, now(), now())
        ON CONFLICT (facebook_page_id, post_id) DO UPDATE SET
          updated_at = now(),
          last_synced_at = now()
        `,
        [event.page_id, event.post_id]
      )
    }

    await markWebhookEventStatus(eventDbId, "PROCESSED")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error"
    await markWebhookEventStatus(eventDbId, "FAILED", message)
    throw error
  }
}

export async function processUnprocessedWebhookEvents(limit = 25) {
  const pending = await query<{ id: number }>(
    `
    SELECT id
    FROM meta_webhook_event
    WHERE processing_status = 'UNPROCESSED'
    ORDER BY received_at ASC
    LIMIT $1
    `,
    [limit]
  )

  for (const row of pending.rows) {
    await processMetaWebhookEventById(row.id)
  }

  return pending.rows.length
}

export async function listMetaWebhookEvents(options: {
  pageId?: string | null
  limit?: number
}) {
  const limit = options.limit ?? 50

  if (options.pageId) {
    const result = await query<MetaWebhookEventRow>(
      `
      SELECT
        id,
        event_id,
        object_type,
        page_id,
        field_name,
        post_id,
        comment_id,
        sender_id,
        event_type,
        raw_payload,
        processing_status,
        received_at,
        processed_at,
        error_log
      FROM meta_webhook_event
      WHERE page_id = $1
      ORDER BY received_at DESC
      LIMIT $2
      `,
      [options.pageId, limit]
    )

    return result.rows
  }

  const result = await query<MetaWebhookEventRow>(
    `
    SELECT
      id,
      event_id,
      object_type,
      page_id,
      field_name,
      post_id,
      comment_id,
      sender_id,
      event_type,
      raw_payload,
      processing_status,
      received_at,
      processed_at,
      error_log
    FROM meta_webhook_event
    ORDER BY received_at DESC
    LIMIT $1
    `,
    [limit]
  )

  return result.rows
}
