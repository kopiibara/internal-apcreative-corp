import { EmployeeApprovalKanbanBoard } from "@/components/employee/approvals/approval-kanban-board"
import {
  getEmployeeContentReportBrandOptions,
  getEmployeeVisibleContentReports,
} from "@/lib/content-reports"
import {
  canEmployeeCreateContentReport,
  decorateApprovalPublishingPermissions,
} from "@/lib/approvals/approval-permissions"
import { requireEmployee } from "@/lib/auth/auth-session"
import { redirect } from "next/navigation"

export default async function ApprovalsPage() {
  const { profile } = await requireEmployee()

  if (profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const [rawReports, brandOptions] = await Promise.all([
    getEmployeeVisibleContentReports(profile.id),
    getEmployeeContentReportBrandOptions(profile.id),
  ])
  const reports = await decorateApprovalPublishingPermissions(profile, rawReports)
  const canCreateContentReport = await canEmployeeCreateContentReport(profile)

  return (
    <EmployeeApprovalKanbanBoard
      reports={reports}
      brandOptions={brandOptions}
      canCreateContentReport={canCreateContentReport}
      currentProfileId={profile.id}
    />
  )
}
