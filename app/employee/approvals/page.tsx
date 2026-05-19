import { redirect } from "next/navigation"

import { ContentReportDataTable } from "@/components/employee/approvals/approval-report-data-table"
import { getMyContentReports } from "@/lib/content-reports"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { can } from "@/lib/permissions"

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

    return <ContentReportDataTable reports={reports} />
}
