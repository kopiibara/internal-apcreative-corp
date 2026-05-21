"use client"

import { ApprovalDataTable } from "@/components/admin/approvals/approval-data-table"
import type { ContentReport } from "@/types/content-report"

type ApprovalTableProps = {
  reports: ContentReport[]
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}

export function ApprovalTable(props: ApprovalTableProps) {
  return <ApprovalDataTable {...props} />
}
