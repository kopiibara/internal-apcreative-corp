import { redirect } from "next/navigation"

import { ReminderBoard } from "@/components/to-do/reminder-board"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { canAccessEmployeeTaskPage } from "@/lib/employee-task-access"
import { getRemindersForProfile } from "@/lib/reminders"

export default async function EmployeeToDoRemindersPage() {
  const context = await getCurrentProfileContext()

  if (!context || context.profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const allowed = await canAccessEmployeeTaskPage(
    context.profile.auth_user_id,
    context.profile.account_type,
    context.profile.id
  )

  if (!allowed) {
    redirect("/employee/dashboard")
  }

  const reminders = await getRemindersForProfile(context.profile.id)

  return <ReminderBoard reminders={reminders} />
}
