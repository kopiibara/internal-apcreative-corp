"use client"

import { AlertTriangle } from "lucide-react"

import { ApprovalDetailSection } from "@/components/shared/approval-details-display"
import { Badge } from "@/components/ui/badge"
import {
  getOpenRevisionRequestsFromLogs,
  type ApprovalRevisionRequest,
} from "@/lib/approvals/approval-revision"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import type { ContentReport } from "@/types/content-report"

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function RevisionRequestCard({ request }: { request: ApprovalRevisionRequest }) {
  return (
    <div className="space-y-3 rounded-lg border-2 border-amber-600 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="border-amber-700 bg-amber-100">
          {request.roleLabel}
        </Badge>
        <Badge variant="secondary" className="border-amber-700 bg-amber-100">
          Open
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-semibold">Requested by:</span>{" "}
          {request.requestedByName}
        </p>
        <p className="text-xs text-amber-900/80">
          {formatRecentOrDateTime(request.requestedAt, dateTimeFormatter)}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide">
          Areas to revise
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {request.areaLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide">
          Instruction
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {request.instruction}
        </p>
        {request.otherExplanation ? (
          <p className="text-sm">
            <span className="font-semibold">Other:</span>{" "}
            {request.otherExplanation}
          </p>
        ) : null}
      </div>
    </div>
  )
}

type ApprovalNeedsRevisionPanelProps = {
  report: ContentReport
}

export function ApprovalNeedsRevisionPanel({
  report,
}: ApprovalNeedsRevisionPanelProps) {
  const openRequests = getOpenRevisionRequestsFromLogs(
    report.activityLogs,
    report,
  )

  if (openRequests.length === 0) {
    return null
  }

  return (
    <ApprovalDetailSection title="Needs Revision" className="border-amber-600">
      <div className="flex items-start gap-3 rounded-lg border-2 border-amber-600 bg-amber-50/80 p-3 text-amber-950">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm leading-relaxed">
          Update the fields listed below, then save and resubmit. The reviewer
          who requested revision will see this request back in Pending.
        </p>
      </div>

      <div className="space-y-3">
        {openRequests.map((request) => (
          <RevisionRequestCard key={request.id} request={request} />
        ))}
      </div>
    </ApprovalDetailSection>
  )
}
