import { after, NextResponse } from "next/server"

import { getMetaWebhookVerifyToken } from "@/lib/meta/config"
import { verifyMetaWebhookSignature } from "@/lib/meta/webhook-signature"
import {
  processMetaWebhookEventById,
  saveMetaWebhookPayload,
} from "@/lib/meta/webhook-events"
import type { MetaWebhookPayload } from "@/lib/meta/types"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const verifyToken = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  const expectedToken = getMetaWebhookVerifyToken()

  if (
    mode === "subscribe" &&
    verifyToken &&
    expectedToken &&
    verifyToken === expectedToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(request: Request) {
  // Read body once as bytes; signature must use the exact payload Meta signed.
  const rawBodyBuffer = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get("x-hub-signature-256")

  if (!verifyMetaWebhookSignature(rawBodyBuffer, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  let payload: MetaWebhookPayload

  try {
    payload = JSON.parse(rawBodyBuffer.toString("utf8")) as MetaWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const insertedIds = await saveMetaWebhookPayload(payload)

  if (insertedIds.length > 0) {
    after(async () => {
      for (const eventId of insertedIds) {
        try {
          await processMetaWebhookEventById(eventId)
        } catch (error) {
          console.error("Meta webhook background processing failed:", error)
        }
      }
    })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
