import type { AccountType } from "@/lib/account-type"
import { getStatusBadgeClassName as getSharedStatusBadgeClassName } from "@/lib/status-badge"

export const APPROVAL_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Revision",
] as const

export const PUBLISH_STATUSES = [
  "Pending",
  "Scheduled",
  "Published",
  "Cancelled",
] as const

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]

export const APPROVAL_STATUS_LABELS = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Revision: "Revision",
} satisfies Record<ApprovalStatus, string>

export const PUBLISH_STATUS_LABELS = {
  Pending: "Pending",
  Scheduled: "Scheduled",
  Published: "Published",
  Cancelled: "Cancelled",
} satisfies Record<PublishStatus, string>

/** Admin approval Kanban column ids (shared workflow stages). */
export type ApprovalKanbanColumnId =
  | "pending"
  | "revision"
  | "rejected"
  | "supervisor-approved"
  | "ready-to-publish"
  | "scheduled"
  | "published"

export type ApprovalKanbanColumn = {
  id: ApprovalKanbanColumnId
  title: string
  description: string
}

/** Canonical admin Kanban column order (aligned with employee publish workflow). */
export const APPROVAL_KANBAN_COLUMN_ORDER = [
  "pending",
  "revision",
  "rejected",
  "supervisor-approved",
  "ready-to-publish",
  "scheduled",
  "published",
] as const satisfies readonly ApprovalKanbanColumnId[]

export const APPROVAL_KANBAN_COLUMNS = [
  {
    id: "pending",
    title: "Pending",
    description: "New submissions waiting to enter review.",
  },
  {
    id: "revision",
    title: "Revision",
    description: "Items sent back for revision.",
  },
  {
    id: "rejected",
    title: "Rejected",
    description: "Items rejected by supervisor or director.",
  },
  {
    id: "supervisor-approved",
    title: "Supervisor Approved",
    description: "Supervisor-approved items waiting on director review.",
  },
  {
    id: "ready-to-publish",
    title: "Ready to Publish",
    description: "Fully approved items ready for publishing.",
  },
  {
    id: "scheduled",
    title: "Scheduled",
    description: "Items scheduled for publishing.",
  },
  {
    id: "published",
    title: "Published",
    description: "Published content reports.",
  },
] as const satisfies readonly ApprovalKanbanColumn[]

export const APPROVAL_KANBAN_COLUMN_IDS = APPROVAL_KANBAN_COLUMN_ORDER

const columnById = new Map(
  APPROVAL_KANBAN_COLUMNS.map((column) => [column.id, column])
)

export function getApprovalKanbanColumn(columnId: ApprovalKanbanColumnId) {
  return columnById.get(columnId)!
}

export function getApprovalKanbanColumnTitle(columnId: string) {
  const column = columnById.get(columnId as ApprovalKanbanColumnId)
  return column?.title ?? columnId
}

/**
 * All workflow columns for admin Kanban (same stages as employee publish pipeline).
 * Role-based visibility is not applied here; drag permissions remain in server actions.
 */
export function getVisibleApprovalKanbanColumns(options?: {
  accountType?: AccountType
  canSupervisorReview?: boolean
  canDirectorReview?: boolean
  canPublishUpdate?: boolean
}) {
  void options
  return APPROVAL_KANBAN_COLUMN_ORDER.map((id) => getApprovalKanbanColumn(id))
}

export function getStatusBadgeVariant(status: string) {
  return status === "Approved" || status === "Published"
    ? "default"
    : "neutral"
}

export function getStatusBadgeClassName(status: string, type: "approval" | "publish" = "approval") {
  return getSharedStatusBadgeClassName(status, type)
}
