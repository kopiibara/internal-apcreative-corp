import { requireEmployee } from "@/lib/auth/auth-session"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { canViewPlatformAnalytics } from "@/lib/platform-analytics/access"
import { can } from "@/lib/permissions"
import {
    canAccessEmployeeTaskPage,
    canAccessEmployeeToDoTaskBoard,
} from "@/lib/tasks/employee-task-access"
import { getEmployeeActionableTaskCount } from "@/lib/tasks/tasks"
import { canAccessPRPage } from "@/lib/pr/pr-permissions"

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { profile, user } = await requireEmployee()
    const [
        canAccessTaskBoard,
        canAccessReminders,
        canAccessAdsCampaigns,
        canAccessDailyProgress,
        canAccessPlatformAnalytics,
        canAccessPR,
    ] =
        await Promise.all([
            canAccessEmployeeToDoTaskBoard(
                profile.auth_user_id,
                profile.id
            ),
            canAccessEmployeeTaskPage(
                profile.auth_user_id,
                profile.account_type,
                profile.id
            ),
            can(profile.auth_user_id, "ads_campaigns.view"),
            Promise.all([
                can(profile.auth_user_id, "daily_progress.submit"),
                can(profile.auth_user_id, "daily_progress.view_own"),
            ]).then((checks) => checks.some(Boolean)),
            canViewPlatformAnalytics(
                profile.auth_user_id,
                profile.id,
                profile.account_type,
            ),
            canAccessPRPage(profile),
        ])
    const actionableTaskCount = canAccessTaskBoard
        ? await getEmployeeActionableTaskCount(profile.id)
        : 0

    return (
        <DashboardShell
            role="employee"
            title="Employee Dashboard"
            employeeActionableTaskCount={actionableTaskCount}
            user={{
                profileId: profile.id,
                name: profile.full_name,
                email: profile.email,
                accountType: profile.account_type,
                canAccessAdsCampaigns,
                canAccessTaskBoard,
                canAccessReminders,
                canAccessDailyProgress,
                canAccessPlatformAnalytics,
                canAccessPR,
                imageUrl: user.image ?? null,
                mustChangePassword: profile.must_change_password,
            }}
        >
            {children}
        </DashboardShell>
    )
}
