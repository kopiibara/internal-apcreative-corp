import type { AccountType } from "@/lib/account-type"

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

export type ApprovalKanbanColumnId =
  | "pending"
  | "supervisor-approved"
  | "approved"
  | "revision"
  | "rejected"
  | "scheduled"
  | "published"

export type ApprovalKanbanColumn = {
  id: ApprovalKanbanColumnId
  title: string
  description: string
}

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
    id: "approved",
    title: "Approved",
    description: "Items approved by supervisor and director.",
  },
  {
    id: "scheduled",
    title: "Scheduled",
    description: "Approved content scheduled for publishing.",
  },
  {
    id: "published",
    title: "Published",
    description: "Content marked as published.",
  },
] as const satisfies readonly ApprovalKanbanColumn[]

export const APPROVAL_KANBAN_COLUMN_IDS = [
  "pending",
  "revision",
  "rejected",
  "supervisor-approved",
  "approved",
  "scheduled",
  "published",
] as const

const supervisorColumnIds: ApprovalKanbanColumnId[] = [
  "pending",
  "revision",
  "rejected",
  "supervisor-approved",
  "approved",
]

const directorColumnIds: ApprovalKanbanColumnId[] = [
  "revision",
  "rejected",
  "supervisor-approved",
  "approved",
  "scheduled",
  "published",
]

const developerColumnIds: ApprovalKanbanColumnId[] = [
  "pending",
  "revision",
  "rejected",
  "supervisor-approved",
  "approved",
  "scheduled",
  "published",
]

export function getVisibleApprovalKanbanColumns({
  accountType,
  canDirectorReview,
}: {
  accountType: AccountType
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}) {
  const visibleIds =
    accountType === "FULL_STACK_DEVELOPER" ||
    accountType === "MANAGER" ||
    accountType === "EXECUTIVE"
      ? developerColumnIds
      : accountType === "SUPERVISOR"
        ? supervisorColumnIds
        : accountType === "DIRECTOR" || canDirectorReview
          ? directorColumnIds
          : developerColumnIds

  return APPROVAL_KANBAN_COLUMNS.filter((column) =>
    visibleIds.includes(column.id)
  )
}

export function getStatusBadgeVariant(status: string) {
  return status === "Approved" || status === "Published"
    ? "default"
    : "outline"
}

export function getStatusBadgeClassName(status: string) {
  if (status === "Approved" || status === "Published") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (status === "Rejected" || status === "Cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  }

  if (status === "Revision") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  if (status === "Scheduled") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
  }

  return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
}
