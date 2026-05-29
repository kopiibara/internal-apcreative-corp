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

type DirectorReviewReadonlyProps = {
  report: ContentReport
}

export function DirectorReviewReadonly({ report }: DirectorReviewReadonlyProps) {
  return (
    <Card size="default" className="w-full">
      <CardHeader>
        <CardTitle>Director Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Director review is read-only for your account.
        </p>
        <div className="space-y-2">
          <Label>Director of Marketing Status</Label>
          <ApprovalRoleStatusBadge
            role="director"
            status={report.directorStatus}
          />
        </div>
        {report.directorNotes ? (
          <div className="space-y-2">
            <Label>Director Notes</Label>
            <p className="whitespace-pre-wrap rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
              {report.directorNotes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
