"use client"

import type { previewGoogleAdsCsv } from "@/lib/ads-campaigns/google-ads-csv-parser"

type GoogleAdsDetectedTemplateSummaryProps = {
  preview: ReturnType<typeof previewGoogleAdsCsv> | null
  errorMessage?: string | null
}

export function GoogleAdsDetectedTemplateSummary({
  preview,
  errorMessage,
}: GoogleAdsDetectedTemplateSummaryProps) {
  if (errorMessage) {
    return (
      <p className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
        {errorMessage}
      </p>
    )
  }

  if (!preview) {
    return null
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-border bg-muted/20 p-3 text-sm">
      <p>
        <span className="font-semibold">Detected template:</span>{" "}
        {preview.templateLabel}
      </p>
      <p>
        <span className="font-semibold">Detected columns:</span>{" "}
        {preview.detectedColumns.join(", ")}
      </p>
      <p>
        <span className="font-semibold">Row count:</span> {preview.rowCount}
      </p>
      {preview.dateRange ? (
        <p>
          <span className="font-semibold">Date range:</span>{" "}
          {preview.dateRange.start} to {preview.dateRange.end}
        </p>
      ) : null}
      {preview.missingOptionalMetrics.length > 0 ? (
        <p className="text-muted-foreground">
          Optional metrics not in this file:{" "}
          {preview.missingOptionalMetrics.join(", ")}
        </p>
      ) : null}
    </div>
  )
}
