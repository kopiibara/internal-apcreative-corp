import { redirect } from "next/navigation"

import { TaskBoard } from "@/components/to-do/task-board"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { canAccessEmployeeTaskPage } from "@/lib/employee-task-access"
import { loadEmployeeTaskBoardPageData } from "@/lib/task-board-page"

export default async function EmployeeToDoTasksPage() {
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

  const pageData = await loadEmployeeTaskBoardPageData(context.profile)

  return <TaskBoard {...pageData} />
}
