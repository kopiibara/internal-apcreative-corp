import type {
  PRCollaborationStatus,
  PRContactStatus,
} from "@/lib/pr/pr-constants";

const contactStatusClasses: Record<PRContactStatus, string> = {
  PENDING:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  CONTACTED:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  DECLINED:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
};

const collaborationStatusClasses: Record<PRCollaborationStatus, string> = {
  PENDING:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  PAID:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  NA: "border-zinc-600 bg-zinc-500 text-white dark:border-zinc-500 dark:bg-zinc-600",
};

const inactiveButtonClass =
  "border-border bg-background text-foreground hover:bg-muted/60";

export function getPRContactStatusBadgeClassName(status: PRContactStatus) {
  return contactStatusClasses[status];
}

export function getPRCollaborationStatusBadgeClassName(
  status: PRCollaborationStatus,
) {
  return collaborationStatusClasses[status];
}

export function getPRContactStatusButtonClassName(
  status: PRContactStatus,
  isActive: boolean,
) {
  return isActive
    ? contactStatusClasses[status]
    : inactiveButtonClass;
}

export function getPRCollaborationStatusButtonClassName(
  status: PRCollaborationStatus,
  isActive: boolean,
) {
  return isActive
    ? collaborationStatusClasses[status]
    : inactiveButtonClass;
}
