import type { AccountType } from "@/lib/auth/account-type";
import { getStatusBadgeClassName as getSharedStatusBadgeClassName } from "@/lib/ui/status-badge";

export const APPROVAL_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Revision",
] as const;

export const PUBLISH_STATUSES = [
  "Pending",
  "Scheduled",
  "Published",
  "Cancelled",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const APPROVAL_STATUS_LABELS = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Revision: "Revision",
} satisfies Record<ApprovalStatus, string>;

export const PUBLISH_STATUS_LABELS = {
  Pending: "Pending",
  Scheduled: "Scheduled",
  Published: "Published",
  Cancelled: "Cancelled",
} satisfies Record<PublishStatus, string>;

/** Admin approval Kanban column ids (shared workflow stages). */
export type ApprovalKanbanColumnId =
  | "pending"
  | "revision"
  | "rejected"
  | "approved"
  | "ready-to-publish"
  | "published";

export type ApprovalKanbanColumn = {
  id: ApprovalKanbanColumnId;
  title: string;
  description: string;
};

/** Canonical admin Kanban column order (aligned with employee publish workflow). */
export const APPROVAL_KANBAN_COLUMN_ORDER = [
  "pending",
  "revision",
  "rejected",
  "approved",
  "ready-to-publish",
  "published",
] as const satisfies readonly ApprovalKanbanColumnId[];

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
    id: "approved",
    title: "Approved",
    description: "Items approved by the current reviewer.",
  },
  {
    id: "ready-to-publish",
    title: "Ready to Publish",
    description: "Fully approved items ready for publishing.",
  },
  {
    id: "published",
    title: "Published",
    description: "Published content reports.",
  },
] as const satisfies readonly ApprovalKanbanColumn[];

export const APPROVAL_KANBAN_COLUMN_IDS = APPROVAL_KANBAN_COLUMN_ORDER;

const columnById = new Map(
  APPROVAL_KANBAN_COLUMNS.map((column) => [column.id, column]),
);

export function getApprovalKanbanColumn(columnId: ApprovalKanbanColumnId) {
  return columnById.get(columnId)!;
}

export function getApprovalKanbanColumnTitle(
  columnId: string,
  accountType?: AccountType,
) {
  const column = columnById.get(columnId as ApprovalKanbanColumnId);

  if (!column) {
    return columnId;
  }

  return getApprovalKanbanColumnDisplayTitle(column, accountType);
}

function getApprovalKanbanColumnDisplayTitle(
  column: ApprovalKanbanColumn,
  accountType?: AccountType,
) {
  void accountType;

  return column.title;
}

/**
 * All workflow columns for admin Kanban (same stages as employee publish pipeline).
 * Column titles adapt to account type; descriptions are omitted for compact headers.
 */
export function getVisibleApprovalKanbanColumns(options?: {
  accountType?: AccountType;
  canSupervisorReview?: boolean;
  canDirectorReview?: boolean;
  canPublishUpdate?: boolean;
}) {
  void options?.canSupervisorReview;
  void options?.canDirectorReview;
  void options?.canPublishUpdate;

  return APPROVAL_KANBAN_COLUMN_ORDER.map((id) => {
    const column = getApprovalKanbanColumn(id);

    return {
      ...column,
      title: getApprovalKanbanColumnDisplayTitle(column, options?.accountType),
      description: "",
    };
  });
}

export function getStatusBadgeVariant(status: string) {
  return status === "Approved" || status === "Published"
    ? "default"
    : "neutral";
}

export function getStatusBadgeClassName(
  status: string,
  type: "approval" | "publish" = "approval",
) {
  return getSharedStatusBadgeClassName(status, type);
}
