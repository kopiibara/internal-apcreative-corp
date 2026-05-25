import type { AccountType } from "@/lib/auth/account-type";
import {
  type ApprovalKanbanColumnId,
  type ApprovalStatus,
  getApprovalKanbanColumnTitle,
  type PublishStatus,
} from "@/lib/approvals/approval-statuses";

export const APPROVAL_KANBAN_DEMO_MARKER =
  "[DEV SEED] Kanban visualization sample";

export type EmployeeApprovalKanbanColumnId =
  | "pending"
  | "supervisor-review"
  | "director-review"
  | "revision"
  | "rejected"
  | "ready-to-publish"
  | "scheduled"
  | "published";

export const EMPLOYEE_APPROVAL_KANBAN_COLUMNS: {
  id: EmployeeApprovalKanbanColumnId;
  title: string;
  description: string;
}[] = [
  {
    id: "pending",
    title: "Pending",
    description: "New submissions waiting to enter review.",
  },
  {
    id: "supervisor-review",
    title: "Supervisor Review",
    description: "Reports waiting on marketing supervisor review.",
  },
  {
    id: "director-review",
    title: "Director Review",
    description: "Supervisor-approved reports waiting on director review.",
  },
  {
    id: "revision",
    title: "Revision",
    description: "Reports sent back for revision.",
  },
  {
    id: "rejected",
    title: "Rejected",
    description: "Reports rejected by supervisor or director.",
  },
  {
    id: "ready-to-publish",
    title: "Ready to Publish",
    description: "Fully approved reports waiting on publishing.",
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
];

/** Canonical workflow stage derived only from supervisor/director/publish fields. */
export type ApprovalWorkflowStage =
  | "published"
  | "scheduled"
  | "rejected"
  | "revision"
  | "ready-to-publish"
  | "director-review"
  | "supervisor-review"
  | "pending";

export type ApprovalKanbanFields = {
  supervisorStatus: ApprovalStatus;
  directorStatus: ApprovalStatus;
  publishStatus: PublishStatus;
  scheduledPublishedDate?: string | null;
};

function isDirectorAwaitingReview(directorStatus: ApprovalStatus) {
  return directorStatus === "Pending";
}

export function isAwaitingDirectorReview(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Approved" &&
    isDirectorAwaitingReview(report.directorStatus)
  );
}

export function isReadyToPublish(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved" &&
    report.publishStatus === "Pending"
  );
}

/**
 * Single source of truth for approval workflow stage (ordered checks).
 * Director Review means supervisor approved and director has not approved yet.
 */
export function resolveApprovalWorkflowStage(
  report: ApprovalKanbanFields,
): ApprovalWorkflowStage {
  if (report.publishStatus === "Published") {
    return "published";
  }

  if (
    report.publishStatus === "Scheduled" ||
    Boolean(report.scheduledPublishedDate)
  ) {
    return "scheduled";
  }

  if (
    report.supervisorStatus === "Rejected" ||
    report.directorStatus === "Rejected" ||
    report.publishStatus === "Cancelled"
  ) {
    return "rejected";
  }

  if (
    report.supervisorStatus === "Revision" ||
    report.directorStatus === "Revision"
  ) {
    return "revision";
  }

  if (isReadyToPublish(report)) {
    return "ready-to-publish";
  }

  if (isAwaitingDirectorReview(report)) {
    return "director-review";
  }

  if (
    report.supervisorStatus === "Pending" &&
    report.directorStatus === "Pending"
  ) {
    return "pending";
  }

  if (report.supervisorStatus === "Pending") {
    return "supervisor-review";
  }

  return "pending";
}

const ADMIN_WORKFLOW_TO_COLUMN: Record<
  ApprovalWorkflowStage,
  ApprovalKanbanColumnId
> = {
  published: "published",
  scheduled: "scheduled",
  rejected: "rejected",
  revision: "revision",
  "ready-to-publish": "ready-to-publish",
  "director-review": "supervisor-approved",
  "supervisor-review": "pending",
  pending: "pending",
};

const EMPLOYEE_WORKFLOW_TO_COLUMN: Record<
  ApprovalWorkflowStage,
  EmployeeApprovalKanbanColumnId
> = {
  published: "published",
  scheduled: "scheduled",
  rejected: "rejected",
  revision: "revision",
  "ready-to-publish": "ready-to-publish",
  "director-review": "director-review",
  "supervisor-review": "supervisor-review",
  pending: "pending",
};

export function getApprovalKanbanStage(
  report: ApprovalKanbanFields,
): ApprovalKanbanColumnId {
  return ADMIN_WORKFLOW_TO_COLUMN[resolveApprovalWorkflowStage(report)];
}

export function getEmployeeApprovalKanbanStage(
  report: ApprovalKanbanFields,
): EmployeeApprovalKanbanColumnId {
  return EMPLOYEE_WORKFLOW_TO_COLUMN[resolveApprovalWorkflowStage(report)];
}

const WORKFLOW_STAGE_LABELS: Record<ApprovalWorkflowStage, string> = {
  published: "Published",
  scheduled: "Scheduled",
  rejected: "Rejected",
  revision: "Revision",
  "ready-to-publish": "Ready to Publish",
  "director-review": "Director Review",
  "supervisor-review": "Supervisor Review",
  pending: "Pending",
};

/** Human-readable workflow label from actual review fields (not a merged status). */
export function getApprovalWorkflowStageLabel(
  report: ApprovalKanbanFields,
  options?: { accountType?: AccountType },
) {
  const stage = resolveApprovalWorkflowStage(report);

  if (stage === "director-review") {
    return WORKFLOW_STAGE_LABELS["director-review"];
  }

  const adminColumnId = ADMIN_WORKFLOW_TO_COLUMN[stage];
  return getApprovalKanbanColumnTitle(adminColumnId, options?.accountType);
}

export function getEmployeeApprovalWorkflowStageLabel(
  report: ApprovalKanbanFields,
) {
  const stage = resolveApprovalWorkflowStage(report);
  return WORKFLOW_STAGE_LABELS[stage];
}
