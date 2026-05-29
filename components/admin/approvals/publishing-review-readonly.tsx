"use client"

import { ApprovalRoleStatusBadge } from "@/components/shared/approval-status-badges"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { ContentReport } from "@/types/content-report"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

type PublishingReviewReadonlyProps = {
  report: ContentReport
}

export function PublishingReviewReadonly({ report }: PublishingReviewReadonlyProps) {
  return (
    <Card size="default" className="w-full">
      <CardHeader>
        <CardTitle>Publishing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Publishing updates are read-only for your account.
        </p>
        <div className="space-y-2">
          <Label>Publish Status</Label>
          <ApprovalRoleStatusBadge role="publish" status={report.publishStatus} />
        </div>
        {report.scheduledPublishedDate ? (
          <div className="space-y-2">
            <Label>Scheduled / Published Date</Label>
            <p className="text-sm font-medium">
              {dateFormatter.format(new Date(report.scheduledPublishedDate))}
            </p>
          </div>
        ) : null}
        {report.remarksRevisionSummary ? (
          <div className="space-y-2">
            <Label>Remarks / Revision Summary</Label>
            <p className="whitespace-pre-wrap rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
              {report.remarksRevisionSummary}
            </p>
          </div>
        ) : null}
        {report.publishingProofUrl ? (
          <div className="space-y-2">
            <Label>Publishing proof URL</Label>
            <a
              href={report.publishingProofUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              {report.publishingProofUrl}
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
