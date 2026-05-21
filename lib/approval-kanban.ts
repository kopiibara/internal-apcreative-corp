import {
  type ApprovalKanbanColumnId,
  type ApprovalStatus,
  type PublishStatus,
} from "@/lib/approval-statuses"

export const APPROVAL_KANBAN_DEMO_MARKER =
  "[DEV SEED] Kanban visualization sample"

export type EmployeeApprovalKanbanColumnId =
  | "pending"
  | "supervisor-review"
  | "director-review"
  | "revision"
  | "rejected"
  | "ready-to-publish"
  | "scheduled"
  | "published"

export const EMPLOYEE_APPROVAL_KANBAN_COLUMNS: {
  id: EmployeeApprovalKanbanColumnId
  title: string
  description: string
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
]

export function getEmployeeApprovalKanbanStage(report: {
  supervisorStatus: ApprovalStatus
  directorStatus: ApprovalStatus
  publishStatus: PublishStatus
}): EmployeeApprovalKanbanColumnId {
  if (
    report.supervisorStatus === "Rejected" ||
    report.directorStatus === "Rejected" ||
    report.publishStatus === "Cancelled"
  ) {
    return "rejected"
  }

  if (
    report.supervisorStatus === "Revision" ||
    report.directorStatus === "Revision"
  ) {
    return "revision"
  }

  if (report.publishStatus === "Published") {
    return "published"
  }

  if (report.publishStatus === "Scheduled") {
    return "scheduled"
  }

  if (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved"
  ) {
    return "ready-to-publish"
  }

  if (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Pending"
  ) {
    return "director-review"
  }

  if (
    report.supervisorStatus === "Pending" &&
    report.directorStatus === "Pending"
  ) {
    return "pending"
  }

  if (report.supervisorStatus === "Pending") {
    return "supervisor-review"
  }

  return "pending"
}

export function getApprovalKanbanStage(report: {
  supervisorStatus: ApprovalStatus
  directorStatus: ApprovalStatus
  publishStatus: PublishStatus
}): ApprovalKanbanColumnId {
  if (
    report.supervisorStatus === "Rejected" ||
    report.directorStatus === "Rejected" ||
    report.publishStatus === "Cancelled"
  ) {
    return "rejected"
  }

  if (
    report.supervisorStatus === "Revision" ||
    report.directorStatus === "Revision"
  ) {
    return "revision"
  }

  if (report.publishStatus === "Published") {
    return "published"
  }

  if (report.publishStatus === "Scheduled") {
    return "scheduled"
  }

  if (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved"
  ) {
    return "approved"
  }

  if (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Pending"
  ) {
    return "supervisor-approved"
  }

  return "pending"
}
