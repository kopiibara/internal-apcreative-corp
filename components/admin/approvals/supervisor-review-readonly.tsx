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

type SupervisorReviewReadonlyProps = {
  report: ContentReport
}

export function SupervisorReviewReadonly({ report }: SupervisorReviewReadonlyProps) {
  return (
    <Card size="default" className="w-full">
      <CardHeader>
        <CardTitle>Supervisor Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Supervisor review is read-only for your account.
        </p>
        <div className="space-y-2">
          <Label>Marketing Supervisor Status</Label>
          <ApprovalRoleStatusBadge
            role="supervisor"
            status={report.supervisorStatus}
          />
        </div>
        {report.supervisorNotes ? (
          <div className="space-y-2">
            <Label>Marketing Supervisor Notes</Label>
            <p className="whitespace-pre-wrap rounded-md border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
              {report.supervisorNotes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
