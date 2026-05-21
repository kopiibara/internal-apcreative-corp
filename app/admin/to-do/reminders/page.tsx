import { ReminderBoard } from "@/components/to-do/reminder-board"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { getRemindersForProfile } from "@/lib/reminders"
import { requirePermission } from "@/lib/permissions"

export default async function AdminToDoRemindersPage() {
  const context = await requirePermission("tasks.view")
  const current = await getCurrentProfileContext()
  const profileId = current?.profile.id ?? context.profile.id
  const reminders = await getRemindersForProfile(profileId)

  return <ReminderBoard reminders={reminders} />
}
