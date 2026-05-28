import { Clock, ExternalLink } from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RichTextRenderer } from "@/components/ui/rich-text-renderer"
import { Separator } from "@/components/ui/separator"
import type { ContentReport } from "@/types/content-report"

type ContentReportDetailsSummaryProps = {
  report: ContentReport
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function LongText({
  value,
  emptyText,
}: {
  value: string | null | undefined
  emptyText?: string
}) {
  return (
    <div className="rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
      <RichTextRenderer value={value} emptyText={emptyText} />
    </div>
  )
}

export function ContentReportDetailsSummary({
  report,
}: ContentReportDetailsSummaryProps) {
  return (
    <Card size="sm" className="shadow-none border-0">
      <CardHeader>
        <CardTitle className="font-bold text-xl"> {report.brandName ?? "No brand"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 ">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-gray-200">
              <Clock className="size-3" />
              {dateFormatter.format(new Date(report.dateSubmitted))}
            </Badge>
            <Badge variant="outline">
              {report.assetLink ? (
                <a
                  href={report.assetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Open asset
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">No asset link</span>
              )}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{report.contentType}</Badge>
            <Badge variant="neutral">{report.platform}</Badge>
          </div>
          <ApprovalStatusBadges
            supervisorStatus={report.supervisorStatus}
            directorStatus={report.directorStatus}
            publishStatus={report.publishStatus}
            compact
          />
        </div>

        <Separator />



        <DetailField label="Content Inspo">
          <LongText value={report.contentInspo} emptyText="None" />
        </DetailField>
        <DetailField label="Full Caption">
          <LongText value={report.caption} />
        </DetailField>
        <DetailField label="Employee Notes / Comments">
          <LongText
            value={report.employeeComments}
            emptyText="No employee comments"
          />
        </DetailField>
      </CardContent>
    </Card>
  )
}
