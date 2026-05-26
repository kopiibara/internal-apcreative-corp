"use client"

import { StatusBadge } from "@/components/shared/status-badge"
import type { ApprovalStatus, PublishStatus } from "@/lib/approvals/approval-statuses"

type ApprovalRole = "supervisor" | "director" | "publish"

const ROLE_LABELS: Record<ApprovalRole, { full: string; short: string }> = {
  supervisor: { full: "Supervisor", short: "Sup" },
  director: { full: "Director", short: "Dir" },
  publish: { full: "Publish", short: "Pub" },
}

type ApprovalRoleStatusBadgeProps = {
  role: ApprovalRole
  status: string
  compact?: boolean
}

export function ApprovalRoleStatusBadge({
  role,
  status,
  compact = false,
}: ApprovalRoleStatusBadgeProps) {
  const prefix = compact ? ROLE_LABELS[role].short : ROLE_LABELS[role].full
  const type = role === "publish" ? "publish" : "approval"

  return <StatusBadge status={status} type={type} prefix={prefix} />
}

type ApprovalStatusBadgesProps = {
  supervisorStatus: ApprovalStatus
  directorStatus: ApprovalStatus
  publishStatus: PublishStatus | "Ready to Publish"
  compact?: boolean
  className?: string
}

export function ApprovalStatusBadges({
  supervisorStatus,
  directorStatus,
  publishStatus,
  compact = false,
  className,
}: ApprovalStatusBadgesProps) {
  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      <ApprovalRoleStatusBadge
        role="supervisor"
        status={supervisorStatus}
        compact={compact}
      />
      <ApprovalRoleStatusBadge
        role="director"
        status={directorStatus}
        compact={compact}
      />
      <ApprovalRoleStatusBadge
        role="publish"
        status={publishStatus}
        compact={compact}
      />
    </div>
  )
}
