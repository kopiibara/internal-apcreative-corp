"use client"

import { Badge } from "@/components/ui/badge"
import {
  getStatusBadgeClassName,
  getStatusBadgeVariant,
  type ApprovalStatus,
  type PublishStatus,
} from "@/lib/approval-statuses"

type ApprovalRole = "supervisor" | "director" | "publish"

const ROLE_LABELS: Record<ApprovalRole, { full: string; short: string }> = {
  supervisor: { full: "Supervisor", short: "Sup" },
  director: { full: "Director", short: "Dir" },
  publish: { full: "Publish", short: "Pub" },
}

function formatRoleStatusLabel(
  role: ApprovalRole,
  status: string,
  compact?: boolean
) {
  const prefix = compact ? ROLE_LABELS[role].short : ROLE_LABELS[role].full
  return `${prefix}: ${status}`
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
  return (
    <Badge
      variant={getStatusBadgeVariant(status)}
      className={getStatusBadgeClassName(status)}
    >
      {formatRoleStatusLabel(role, status, compact)}
    </Badge>
  )
}

type ApprovalStatusBadgesProps = {
  supervisorStatus: ApprovalStatus
  directorStatus: ApprovalStatus
  publishStatus: PublishStatus
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
    <div className={className ?? "flex flex-wrap gap-1.5"}>
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
