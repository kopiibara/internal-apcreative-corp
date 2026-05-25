import { requireEmployee } from "@/lib/auth/auth-session"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getEmployeeActionableTaskCount } from "@/lib/tasks/tasks"
import { can } from "@/lib/permissions"

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { profile, user } = await requireEmployee()
    const [actionableTaskCount, canAccessAdsCampaigns] = await Promise.all([
        getEmployeeActionableTaskCount(profile.id),
        can(profile.auth_user_id, "ads_campaigns.view"),
    ])

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
                imageUrl: user.image ?? null,
                mustChangePassword: profile.must_change_password,
            }}
        >
            {children}
        </DashboardShell>
    )
}
