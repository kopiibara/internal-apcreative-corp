import { redirect } from "next/navigation"

import { TaskBoard } from "@/components/to-do/task-board"
import { requireEmployee } from "@/lib/auth/auth-session"
import { canAccessEmployeeToDoTaskBoard } from "@/lib/tasks/employee-task-access"
import { loadEmployeeTaskBoardPageData } from "@/lib/tasks/task-board-page"

export default async function EmployeeToDoTasksPage() {
  const { profile } = await requireEmployee()

  if (profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const canAccessTaskBoard = await canAccessEmployeeToDoTaskBoard(
    profile.auth_user_id,
    profile.id
  )

  if (!canAccessTaskBoard) {
    redirect("/employee/to-do/reminders")
  }

  const pageData = await loadEmployeeTaskBoardPageData(profile)

  return <TaskBoard {...pageData} />
}
