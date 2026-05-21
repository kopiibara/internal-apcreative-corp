import { createHash } from "node:crypto"

import type {
  MetaWebhookChange,
  MetaWebhookEntry,
  MetaWebhookPayload,
} from "@/lib/meta/types"

export type ParsedMetaWebhookEvent = {
  eventId: string
  objectType: string
  pageId: string | null
  fieldName: string | null
  postId: string | null
  commentId: string | null
  senderId: string | null
  eventType: string | null
}

function buildEventType(change: MetaWebhookChange) {
  const value = change.value
  if (!value) {
    return change.field ?? "unknown"
  }

  const parts = [change.field, value.item, value.verb].filter(Boolean)
  return parts.join(":") || "unknown"
}

function extractIds(change: MetaWebhookChange) {
  const value = change.value
  const postId =
    (typeof value?.post_id === "string" ? value.post_id : null) ??
    (typeof value?.parent_id === "string" ? value.parent_id : null) ??
    null
  const commentId =
    typeof value?.comment_id === "string" ? value.comment_id : null
  const senderId =
    typeof value?.from?.id === "string" ? value.from.id : null

  return { postId, commentId, senderId }
}

export function buildWebhookEventId(
  payload: MetaWebhookPayload,
  entry: MetaWebhookEntry,
  change: MetaWebhookChange,
  receivedAtIso: string
) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        object: payload.object,
        entryId: entry.id,
        time: entry.time,
        field: change.field,
        value: change.value,
        receivedAtIso,
      })
    )
    .digest("hex")

  return `meta_${digest.slice(0, 48)}`
}

export function parseMetaWebhookPayload(payload: MetaWebhookPayload) {
  const objectType = payload.object ?? "unknown"
  const receivedAtIso = new Date().toISOString()
  const events: ParsedMetaWebhookEvent[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const { postId, commentId, senderId } = extractIds(change)

      events.push({
        eventId: buildWebhookEventId(payload, entry, change, receivedAtIso),
        objectType,
        pageId: entry.id ?? null,
        fieldName: change.field ?? null,
        postId,
        commentId,
        senderId,
        eventType: buildEventType(change),
      })
    }
  }

  return events
}
