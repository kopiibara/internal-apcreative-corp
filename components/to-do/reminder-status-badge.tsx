import { Badge } from "@/components/ui/badge"
import {
  getReminderStatusColorClass,
  getReminderStatusLabel,
  type ReminderStatus,
} from "@/lib/reminder-statuses"

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge variant="outline" className={getReminderStatusColorClass(status)}>
      {getReminderStatusLabel(status)}
    </Badge>
  )
}
