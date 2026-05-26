import { redirect } from "next/navigation"

import { requireEmployee } from "@/lib/auth/auth-session"
import { canAccessEmployeeToDoTaskBoard } from "@/lib/tasks/employee-task-access"

export default async function EmployeeToDoPage() {
  const { profile } = await requireEmployee()

  const canAccessTasks = await canAccessEmployeeToDoTaskBoard(
    profile.auth_user_id,
    profile.id,
  )

  redirect(
    canAccessTasks ? "/employee/to-do/tasks" : "/employee/to-do/reminders",
  )
}
