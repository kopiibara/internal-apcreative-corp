export const TASK_STATUSES = [
  "ASSIGNED",
  "BLOCKER",
  "PENDING",
  "REVISION",
  "REJECTED",
  "DONE",
] as const;

export type TaskAssignmentStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "Assigned",
  BLOCKER: "Blocker",
  PENDING: "Pending",
  REVISION: "Revision",
  REJECTED: "Rejected",
  DONE: "Done",
};

import { getStatusBadgeClassName } from "@/lib/ui/status-badge";

export const TASK_STATUS_BADGE_CLASS_NAMES: Record<
  TaskAssignmentStatus,
  string
> = {
  ASSIGNED: getStatusBadgeClassName("ASSIGNED", "task"),
  BLOCKER: getStatusBadgeClassName("BLOCKER", "task"),
  PENDING: getStatusBadgeClassName("PENDING", "task"),
  REVISION: getStatusBadgeClassName("REVISION", "task"),
  REJECTED: getStatusBadgeClassName("REJECTED", "task"),
  DONE: getStatusBadgeClassName("DONE", "task"),
};

export const TASK_KANBAN_COLUMNS: {
  id: TaskAssignmentStatus;
  title: string;
  description: string;
}[] = [
  {
    id: "ASSIGNED",
    title: "Assigned",
    description: "Waiting for employee action.",
  },
  {
    id: "BLOCKER",
    title: "Blocker",
    description: "Blocked by a dependency or clarification.",
  },
  {
    id: "PENDING",
    title: "Pending",
    description: "Proof submitted, awaiting review.",
  },
  {
    id: "REVISION",
    title: "Revision",
    description: "Proof needs changes before resubmission.",
  },
  {
    id: "REJECTED",
    title: "Rejected",
    description: "Reviewer rejected the submitted task.",
  },
  {
    id: "DONE",
    title: "Done",
    description: "Reviewer confirmed completion.",
  },
];

export function getTaskStatusLabel(status: TaskAssignmentStatus) {
  return TASK_STATUS_LABELS[status];
}

export function getTaskStatusColorClass(status: TaskAssignmentStatus) {
  return TASK_STATUS_BADGE_CLASS_NAMES[status];
}
