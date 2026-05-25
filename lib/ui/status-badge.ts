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
  "border-border bg-muted/40 text-muted-foreground"

const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING:
    "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  APPROVED:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  REJECTED:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  REVISION:
    "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200",
  SCHEDULED:
    "border-violet-600 bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  PUBLISHED:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  CANCELLED:
    "border-red-500 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  DRAFT: "border-border bg-muted/50 text-muted-foreground",
  ASSIGNED: "border-border bg-muted/40 text-muted-foreground",
  BLOCKER:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  DONE:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  DUE:
    "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200",
  ARCHIVED: "border-border bg-muted/50 text-muted-foreground",
  ACTIVE:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  INACTIVE: "border-border bg-muted/50 text-muted-foreground",
  INVITED:
    "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  DISABLED: "border-border bg-muted/50 text-muted-foreground",
  DELETED:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  SUSPENDED:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  PAUSED:
    "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  ENDED: "border-border bg-muted/50 text-muted-foreground",
  MISSING:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  SUBMITTED:
    "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  CONFIRMED:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  ON_TIME:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  LATE:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  LOW:
    "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  MEDIUM:
    "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  HIGH:
    "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200",
  URGENT:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  OVERDUE:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  PROCESSING:
    "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  PROCESSED:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  FAILED:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  EXCELLENT:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  GOOD:
    "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  NEEDS_REVIEW:
    "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  CRITICAL:
    "border-red-600 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  UNKNOWN: UNKNOWN_BADGE_CLASS,
  GRADED:
    "border-violet-600 bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  NON_GRADED: "border-border bg-muted/50 text-muted-foreground",
  APPROVAL:
    "border-violet-600 bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  TASK:
    "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  BRAND:
    "border-blue-600 bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200",
  EMPLOYEE:
    "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200",
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
      "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
  },
  reminder: {
    PENDING:
      "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
    DUE:
      "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200",
  },
  publish: {
    PENDING:
      "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  },
  proof: {
    PENDING:
      "border-cyan-600 bg-cyan-100 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-200",
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
