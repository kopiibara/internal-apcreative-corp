import { EmployeeApprovalKanbanBoard } from "@/components/employee/approvals/approval-kanban-board"
import { getMyContentReports } from "@/lib/content-reports"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { can } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function ApprovalsPage() {
  const context = await getCurrentProfileContext()

  if (!context || context.profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const allowed = await can(
    context.profile.auth_user_id,
    "content_reports.view"
  )

  if (!allowed) {
    redirect("/employee/dashboard")
  }

  const reports = await getMyContentReports(context.profile.id)

  return <EmployeeApprovalKanbanBoard reports={reports} />
}
