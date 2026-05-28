import "server-only"

import { getMetaGraphApiVersion } from "@/lib/meta/config"
import { getMetaPageByFacebookPageId } from "@/lib/meta/pages-config"
import type { MetaFacebookPageRow, MetaSyncType } from "@/lib/meta/types"

export type MetaSyncLogSource = "page_summary" | "posts" | "insights"

export type MetaSyncLogContext = {
  source: MetaSyncLogSource
  facebookPageId: string
  brandId?: number | null
  brandName?: string | null
  pageName?: string | null
  syncType?: MetaSyncType
  dateRange?: string
  metric?: string
  status: "started" | "success" | "failed" | "partial" | "skipped"
  errorCode?: number | null
  errorMessage?: string
  recordsAffected?: number
  startedAt?: string
  finishedAt?: string
}

function extractMetaErrorCode(message: string) {
  const match = message.match(/\(#(\d+)\)/)
  return match ? Number(match[1]) : null
}

export function resolveMetaSyncLogContext(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "page_name" | "brand_id">,
  syncType: MetaSyncType
): Pick<
  MetaSyncLogContext,
  "facebookPageId" | "brandId" | "brandName" | "pageName" | "syncType"
> {
  const config = getMetaPageByFacebookPageId(page.facebook_page_id)

  return {
    facebookPageId: page.facebook_page_id,
    brandId: page.brand_id,
    brandName: config?.displayName ?? page.page_name,
    pageName: page.page_name,
    syncType,
  }
}

export function logMetaSyncEvent(context: MetaSyncLogContext) {
  const payload = {
    graphApiVersion: getMetaGraphApiVersion(),
    brandId: context.brandId ?? null,
    brandName: context.brandName ?? null,
    pageId: context.facebookPageId,
    pageName: context.pageName ?? null,
    syncType: context.syncType ?? null,
    dateRange: context.dateRange ?? null,
    metric: context.metric ?? null,
    recordsAffected: context.recordsAffected ?? null,
    startedAt: context.startedAt ?? null,
    finishedAt: context.finishedAt ?? null,
    errorCode:
      context.errorCode ??
      extractMetaErrorCode(context.errorMessage ?? ""),
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
