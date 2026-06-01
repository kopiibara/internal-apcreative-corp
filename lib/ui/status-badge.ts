export type StatusBadgeType =
  | "approval"
  | "publish"
  | "task"
  | "account"
  | "brand"
  | "campaign"
  | "priority"
  | "proof"
  | "performance"
  | "reminder"
  | "default"

const UNKNOWN_BADGE_CLASS =
  "border-border bg-muted text-muted-foreground"

/** Solid fill + matching border; high-contrast label text. */
const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  APPROVED:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  REJECTED:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  REVISION:
    "border-orange-600 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-600",
  SCHEDULED:
    "border-violet-700 bg-violet-600 text-white dark:border-violet-600 dark:bg-violet-700",
  PUBLISHED:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  CANCELLED:
    "border-red-600 bg-red-500 text-white dark:border-red-500 dark:bg-red-600",
  DRAFT: "border-border bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  ASSIGNED: "border-border bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  BLOCKER:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  DONE:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  DUE:
    "border-orange-600 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-600",
  ARCHIVED: "border-border bg-zinc-400 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  ACTIVE:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  INACTIVE: "border-border bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  INVITED:
    "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  DISABLED: "border-border bg-zinc-300 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-300",
  DELETED:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  SUSPENDED:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  PAUSED:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  ENDED: "border-border bg-zinc-400 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  MISSING:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  SUBMITTED:
    "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  CONFIRMED:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  ON_TIME:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  LATE:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  LOW:
    "border-emerald-600 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-600",
  MEDIUM:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  HIGH:
    "border-orange-600 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-600",
  URGENT:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  OVERDUE:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  PROCESSING:
    "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  PROCESSED:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  FAILED:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  EXCELLENT:
    "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700",
  GOOD:
    "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  NEEDS_REVIEW:
    "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  CRITICAL:
    "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
  UNKNOWN: UNKNOWN_BADGE_CLASS,
  GRADED:
    "border-violet-700 bg-violet-600 text-white dark:border-violet-600 dark:bg-violet-700",
  NON_GRADED: "border-border bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  APPROVAL:
    "border-violet-700 bg-violet-600 text-white dark:border-violet-600 dark:bg-violet-700",
  TASK:
    "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  BRAND:
    "border-blue-700 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-700",
  EMPLOYEE:
    "border-orange-600 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-600",
  PR:
    "border-fuchsia-700 bg-fuchsia-600 text-white dark:border-fuchsia-600 dark:bg-fuchsia-700",
  READY_TO_PUBLISH:
    "border-violet-700 bg-violet-600 text-white dark:border-violet-600 dark:bg-violet-700",
}

const TYPE_ALIASES: Record<StatusBadgeType, Record<string, string>> = {
  approval: {
    SUPERVISOR_APPROVED: "APPROVED",
    SUPERVISOR_PENDING: "PENDING",
    DIRECTOR_APPROVED: "APPROVED",
  },
  publish: {},
  task: {},
  account: {},
  brand: {
    TRUE: "ACTIVE",
    FALSE: "INACTIVE",
  },
  campaign: {},
  priority: {},
  proof: {
    PENDING_REVIEW: "PENDING",
    PROOF_SUBMITTED: "SUBMITTED",
    MISSING_PROOF: "MISSING",
  },
  performance: {},
  reminder: {},
  default: {},
}

const TYPE_COLOR_OVERRIDES: Partial<
  Record<StatusBadgeType, Record<string, string>>
> = {
  task: {
    PENDING:
      "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  },
  reminder: {
    PENDING:
      "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
    DUE:
      "border-orange-600 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-600",
  },
  publish: {
    PENDING:
      "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
  },
  proof: {
    PENDING:
      "border-cyan-700 bg-cyan-600 text-white dark:border-cyan-600 dark:bg-cyan-700",
  },
}

const EXPLICIT_LABELS: Record<string, string> = {
  ON_TIME: "On time",
  NON_GRADED: "Personal",
  GRADED: "Graded",
  FULL_STACK_DEVELOPER: "Full-stack Developer",
  SUPERVISOR: "Supervisor",
  DIRECTOR: "Director",
  MANAGER: "Manager",
  EXECUTIVE: "Executive",
  EMPLOYEE: "Employee",
  CLIENT: "Client",
  PENDING_REVIEW: "Pending review",
  PROOF_SUBMITTED: "Proof submitted",
  MISSING_PROOF: "Missing proof",
  BLOCKER_REPORTED: "Blocker reported",
  NEEDS_REVIEW: "Needs Review",
  READY_TO_PUBLISH: "Ready to Publish",
}

export function normalizeStatus(status: string | null | undefined) {
  if (!status) {
    return "UNKNOWN"
  }

  return status
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w]/g, "")
    .toUpperCase()
}

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Unknown"
  }

  const normalized = normalizeStatus(status)

  if (EXPLICIT_LABELS[normalized]) {
    return EXPLICIT_LABELS[normalized]
  }

  if (/^[A-Z0-9_]+$/.test(status.trim())) {
    return normalized
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ")
  }

  return status.trim()
}

function resolveStatusKey(
  status: string | null | undefined,
  type: StatusBadgeType = "default"
) {
  const normalized = normalizeStatus(status)
  const alias = TYPE_ALIASES[type][normalized]

  return alias ?? normalized
}

export function getStatusBadgeClassName(
  status: string | null | undefined,
  type: StatusBadgeType = "default"
) {
  const key = resolveStatusKey(status, type)
  const typeOverride = TYPE_COLOR_OVERRIDES[type]?.[key]

  if (typeOverride) {
    return typeOverride
  }

  return STATUS_COLOR_MAP[key] ?? STATUS_COLOR_MAP.UNKNOWN
}

/** @deprecated Use getStatusBadgeClassName with type="approval" or "publish" */
export function getApprovalStatusBadgeClassName(status: string) {
  return getStatusBadgeClassName(status, "approval")
}

/** @deprecated Use getStatusBadgeClassName with type="task" */
export function getTaskStatusBadgeClassName(status: string) {
  return getStatusBadgeClassName(status, "task")
}

/** @deprecated Use getStatusBadgeClassName with type="reminder" */
export function getReminderStatusBadgeClassName(status: string) {
  return getStatusBadgeClassName(status, "reminder")
}
