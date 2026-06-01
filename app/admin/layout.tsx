import { requireAdmin } from "@/lib/auth/auth-session"
import { isFullStackDeveloperAccountType } from "@/lib/auth/full-stack-developer-access"
import { query } from "@/lib/db"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { can } from "@/lib/permissions"
import { getEmployeeActionableTaskCount } from "@/lib/tasks/tasks"
import { canAccessPRPage } from "@/lib/pr/pr-permissions"
import { getSidebarPerformanceSummary } from "@/lib/staff-accountability/sidebar-performance"

type RoleSlugRow = {
    slug: string
}

async function getActiveRoleSlugs(profileId: number) {
    const result = await query<RoleSlugRow>(
        `
        SELECT DISTINCT r.slug
        FROM user_brand_access uba
        JOIN "role" r ON r.id = uba.role_id
        WHERE uba.profile_id = $1
          AND uba.is_active = true
        `,
        [profileId]
    )

    return result.rows.map((row) => row.slug)
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { profile, user } = await requireAdmin()
    const [
        roleSlugs,
        canAccessDailyProgress,
        canAccessPR,
        actionableTaskCount,
        performanceSummary,
    ] =
        await Promise.all([
            getActiveRoleSlugs(profile.id),
            Promise.all([
                can(profile.auth_user_id, "daily_progress.view_all"),
                can(profile.auth_user_id, "daily_progress.manage"),
            ]).then((checks) => checks.some(Boolean)),
            canAccessPRPage(profile),
            isFullStackDeveloperAccountType(profile.account_type)
                ? getEmployeeActionableTaskCount(profile.id)
                : Promise.resolve(0),
            getSidebarPerformanceSummary(profile.id),
        ])

    return (
        <DashboardShell
            role="admin"
            title="Admin Dashboard"
            employeeActionableTaskCount={actionableTaskCount}
            user={{
                profileId: profile.id,
                name: profile.full_name,
                email: profile.email,
                accountType: profile.account_type,
                roleSlugs,
                canAccessDailyProgress,
                canAccessPR,
                imageUrl: user.image ?? null,
                mustChangePassword: profile.must_change_password,
                performanceSummary,
            }}
        >
            {children}
        </DashboardShell>
    )
}
