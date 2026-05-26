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
  | "revision"
  | "rejected"
  | "approved"
  | "ready-to-publish"
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
    id: "approved",
    title: "Approved",
    description: "Reports approved by one reviewer and waiting on the other.",
  },
  {
    id: "ready-to-publish",
    title: "Ready to Publish",
    description: "Fully approved reports waiting on publishing.",
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
  | "rejected"
  | "revision"
  | "ready-to-publish"
  | "approved"
  | "pending";

export type ApprovalKanbanFields = {
  supervisorStatus: ApprovalStatus;
  directorStatus: ApprovalStatus;
  publishStatus: PublishStatus;
  scheduledPublishedDate?: string | null;
};

export type ApprovalDisplayStatus = {
  supervisorStatus: ApprovalStatus;
  directorStatus: ApprovalStatus;
  publishStatus: PublishStatus | "Ready to Publish";
};

type ApprovalReviewerLane = "supervisor" | "director" | "overview";

export type ApprovalKanbanViewerContext = {
  accountType?: AccountType;
  position?: string | null;
  canSupervisorReview?: boolean;
  canDirectorReview?: boolean;
  canPublishUpdate?: boolean;
  isBrandOfficerView?: boolean;
};

function isDirectorPosition(position?: string | null) {
  return position?.toLowerCase().includes("director") ?? false;
}

export function isReadyToPublish(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved" &&
    report.publishStatus !== "Published" &&
    report.publishStatus !== "Cancelled"
  );
}

function isRejected(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Rejected" ||
    report.directorStatus === "Rejected" ||
    report.publishStatus === "Cancelled"
  );
}

function isRevision(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Revision" ||
    report.directorStatus === "Revision"
  );
}

function hasAnyApproval(report: ApprovalKanbanFields) {
  return (
    report.supervisorStatus === "Approved" ||
    report.directorStatus === "Approved"
  );
}

export function getApprovalReviewerLane({
  accountType,
  position,
  canSupervisorReview,
  canDirectorReview,
  isBrandOfficerView,
}: ApprovalKanbanViewerContext): ApprovalReviewerLane {
  if (isBrandOfficerView) {
    return "overview";
  }

  if (accountType === "SUPERVISOR") {
    return "supervisor";
  }

  if (accountType === "DIRECTOR" || isDirectorPosition(position)) {
    return "director";
  }

  if (canSupervisorReview && !canDirectorReview) {
    return "supervisor";
  }

  if (canDirectorReview && !canSupervisorReview) {
    return "director";
  }

  return "overview";
}

export function getApprovalKanbanColumn(
  report: ApprovalKanbanFields,
  context: ApprovalKanbanViewerContext = {},
): ApprovalKanbanColumnId {
  if (report.publishStatus === "Published") {
    return "published";
  }

  if (isRejected(report)) {
    return "rejected";
  }

  if (isRevision(report)) {
    return "revision";
  }

  if (isReadyToPublish(report)) {
    return "ready-to-publish";
  }

  const lane = getApprovalReviewerLane(context);

  if (lane === "supervisor") {
    return report.supervisorStatus === "Approved" ? "approved" : "pending";
  }

  if (lane === "director") {
    return report.directorStatus === "Approved" ? "approved" : "pending";
  }

  return hasAnyApproval(report) ? "approved" : "pending";
}

export function getApprovalDisplayStatus(
  report: ApprovalKanbanFields,
): ApprovalDisplayStatus {
  return {
    supervisorStatus: report.supervisorStatus,
    directorStatus: report.directorStatus,
    publishStatus:
      isReadyToPublish(report) && report.publishStatus === "Pending"
        ? "Ready to Publish"
        : report.publishStatus,
  };
}

/** Single source of truth for approval workflow stage labels. */
export function resolveApprovalWorkflowStage(
  report: ApprovalKanbanFields,
  context: ApprovalKanbanViewerContext = {},
): ApprovalWorkflowStage {
  return getApprovalKanbanColumn(report, context);
}

export function getApprovalKanbanStage(
  report: ApprovalKanbanFields,
  context: ApprovalKanbanViewerContext = {},
): ApprovalKanbanColumnId {
  return getApprovalKanbanColumn(report, context);
}

export function getEmployeeApprovalKanbanStage(
  report: ApprovalKanbanFields,
): EmployeeApprovalKanbanColumnId {
  return getApprovalKanbanColumn(report, { isBrandOfficerView: true });
}

const WORKFLOW_STAGE_LABELS: Record<ApprovalWorkflowStage, string> = {
  published: "Published",
  rejected: "Rejected",
  revision: "Revision",
  "ready-to-publish": "Ready to Publish",
  approved: "Approved",
  pending: "Pending",
};

/** Human-readable workflow label from actual review fields (not a merged status). */
export function getApprovalWorkflowStageLabel(
  report: ApprovalKanbanFields,
  options?: ApprovalKanbanViewerContext,
) {
  const stage = resolveApprovalWorkflowStage(report, options);
  return getApprovalKanbanColumnTitle(stage, options?.accountType);
}

export function getEmployeeApprovalWorkflowStageLabel(
  report: ApprovalKanbanFields,
) {
  const stage = resolveApprovalWorkflowStage(report);
  return WORKFLOW_STAGE_LABELS[stage];
}

function isReviewActionable(status: ApprovalStatus) {
  return status === "Pending" || status === "Revision";
}

function isOpenForReviewCount(report: ApprovalKanbanFields) {
  return report.publishStatus !== "Published" && report.publishStatus !== "Cancelled";
}

export function getSupervisorPendingCount(reports: ApprovalKanbanFields[]) {
  return reports.filter(
    (report) =>
      isOpenForReviewCount(report) && isReviewActionable(report.supervisorStatus),
  ).length;
}

export function getDirectorPendingCount(reports: ApprovalKanbanFields[]) {
  return reports.filter(
    (report) =>
      isOpenForReviewCount(report) && isReviewActionable(report.directorStatus),
  ).length;
}

export function getBrandOfficerReadyToPublishCount(
  reports: ApprovalKanbanFields[],
) {
  return reports.filter(isReadyToPublish).length;
}

export function getApprovalActionableCount(
  reports: ApprovalKanbanFields[],
  context: ApprovalKanbanViewerContext,
) {
  if (context.isBrandOfficerView) {
    return getBrandOfficerReadyToPublishCount(reports);
  }

  const lane = getApprovalReviewerLane(context);

  if (lane === "supervisor") {
    return getSupervisorPendingCount(reports);
  }

  if (lane === "director") {
    return getDirectorPendingCount(reports);
  }

  return reports.filter(
    (report) =>
      getApprovalKanbanColumn(report, context) === "pending" &&
      isOpenForReviewCount(report),
  ).length;
}
