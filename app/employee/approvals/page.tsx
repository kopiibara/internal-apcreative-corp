import { EmployeeApprovalKanbanBoard } from "@/components/employee/approvals/approval-kanban-board"
import {
  getEmployeeContentReportBrandOptions,
  getMyContentReports,
} from "@/lib/content-reports"
import { requireEmployee } from "@/lib/auth/auth-session"
import { redirect } from "next/navigation"

export default async function ApprovalsPage() {
  const { profile } = await requireEmployee()

  if (profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const [reports, brandOptions] = await Promise.all([
    getMyContentReports(profile.id),
    getEmployeeContentReportBrandOptions(profile.id),
  ])

  return (
    <EmployeeApprovalKanbanBoard
      reports={reports}
      brandOptions={brandOptions}
    />
  )
}
