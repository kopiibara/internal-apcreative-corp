import { StatusBadge } from "@/components/shared/status-badge"
import type { ReminderStatus } from "@/lib/reminders/reminder-statuses"

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return <StatusBadge status={status} type="reminder" />
}
