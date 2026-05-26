import { redirect } from "next/navigation"

import { ReminderBoard } from "@/components/to-do/reminder-board"
import { requireEmployee } from "@/lib/auth/auth-session"
import { canAccessEmployeeTaskPage } from "@/lib/tasks/employee-task-access"
import { getRemindersForProfile } from "@/lib/reminders/reminders"

export default async function EmployeeToDoRemindersPage() {
  const { profile } = await requireEmployee()

  if (profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const canAccessReminders = await canAccessEmployeeTaskPage(
    profile.auth_user_id,
    profile.account_type,
    profile.id
  )

  if (!canAccessReminders) {
    redirect("/employee/dashboard")
  }

  const reminders = await getRemindersForProfile(profile.id)

  return <ReminderBoard reminders={reminders} />
}
