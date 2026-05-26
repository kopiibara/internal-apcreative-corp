import { NextResponse } from "next/server"
import { z } from "zod"

import { getMetaCronSecret } from "@/lib/meta/config"
import { processUnprocessedWebhookEvents } from "@/lib/meta/webhook-events"
import { runMetaSyncJob } from "@/lib/meta/sync"
import type { MetaSyncType } from "@/lib/meta/types"

export const runtime = "nodejs"

const cronSchema = z.object({
  job: z.enum([
    "hourly_posts",
    "daily_page",
    "daily_insights",
    "weekly_summary",
    "monthly_summary",
    "process_webhooks",
  ]),
})

function authorizeCron(request: Request) {
  const secret = getMetaCronSecret()
  if (!secret) {
    return false
  }

  const headerSecret = request.headers.get("x-meta-cron-secret")
  const url = new URL(request.url)
  const querySecret = url.searchParams.get("secret")

  return headerSecret === secret || querySecret === secret
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = cronSchema.safeParse({
    job: url.searchParams.get("job") ?? "process_webhooks",
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job parameter", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    if (parsed.data.job === "process_webhooks") {
      const processed = await processUnprocessedWebhookEvents(50)
      return NextResponse.json({
        success: true,
        job: parsed.data.job,
        processed,
      })
    }

    const affected = await runMetaSyncJob(parsed.data.job as MetaSyncType)
    return NextResponse.json({
      success: true,
      job: parsed.data.job,
      recordsAffected: affected,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Meta cron job failed"
    console.error("Meta cron error:", error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
