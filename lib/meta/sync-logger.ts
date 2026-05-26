import "server-only"

import { getMetaGraphApiVersion } from "@/lib/meta/config"

export type MetaSyncLogContext = {
  source: "page_summary" | "posts" | "insights"
  facebookPageId: string
  brandId?: number | null
  dateRange?: string
  metric?: string
  status: "success" | "failed" | "partial" | "skipped"
  errorCode?: number | null
  errorMessage?: string
  recordsAffected?: number
}

function extractMetaErrorCode(message: string) {
  const match = message.match(/\(#(\d+)\)/)
  return match ? Number(match[1]) : null
}

export function logMetaSyncEvent(context: MetaSyncLogContext) {
  const payload = {
    graphApiVersion: getMetaGraphApiVersion(),
    brandId: context.brandId ?? null,
    pageId: context.facebookPageId,
    dateRange: context.dateRange ?? null,
    metric: context.metric ?? null,
    recordsAffected: context.recordsAffected ?? null,
    errorCode: context.errorCode ?? extractMetaErrorCode(context.errorMessage ?? ""),
    errorMessage: context.errorMessage ?? null,
  }

  const prefix = `[meta-sync:${context.source}] ${context.status}`

  if (context.status === "failed") {
    console.error(prefix, payload)
    return
  }

  if (context.status === "partial") {
    console.warn(prefix, payload)
    return
  }

  console.info(prefix, payload)
}
