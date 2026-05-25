export const REMINDER_STATUSES = [
  "PENDING",
  "DUE",
  "DONE",
  "ARCHIVED",
] as const;

export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const REMINDER_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type ReminderPriority = (typeof REMINDER_PRIORITIES)[number];

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  PENDING: "Pending",
  DUE: "Due",
  DONE: "Done",
  ARCHIVED: "Archived",
};

import { getStatusBadgeClassName } from "@/lib/ui/status-badge";

export const REMINDER_STATUS_BADGE_CLASS_NAMES: Record<ReminderStatus, string> =
  {
    PENDING: getStatusBadgeClassName("PENDING", "reminder"),
    DUE: getStatusBadgeClassName("DUE", "reminder"),
    DONE: getStatusBadgeClassName("DONE", "reminder"),
    ARCHIVED: getStatusBadgeClassName("ARCHIVED", "reminder"),
  };

export const REMINDER_KANBAN_COLUMNS: {
  id: ReminderStatus;
  title: string;
  description: string;
}[] = [
  {
    id: "PENDING",
    title: "Pending",
    description: "Upcoming reminders.",
  },
  {
    id: "DUE",
    title: "Due",
    description: "Needs attention now.",
  },
  {
    id: "DONE",
    title: "Done",
    description: "Completed reminders.",
  },
  {
    id: "ARCHIVED",
    title: "Archived",
    description: "Removed from active work.",
  },
];

export function getReminderStatusLabel(status: ReminderStatus) {
  return REMINDER_STATUS_LABELS[status];
}

export function getReminderStatusColorClass(status: ReminderStatus) {
  return REMINDER_STATUS_BADGE_CLASS_NAMES[status];
}
