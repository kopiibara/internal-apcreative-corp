import { requireAdmin } from "@/lib/auth/auth-session"
import { query } from "@/lib/db"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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
    const { profile } = await requireAdmin()
    const roleSlugs = await getActiveRoleSlugs(profile.id)

    return (
        <DashboardShell
            role="admin"
            title="Admin Dashboard"
            user={{
                name: profile.full_name,
                email: profile.email,
                accountType: profile.account_type,
                roleSlugs,
                mustChangePassword: profile.must_change_password,
            }}
        >
            {children}
        </DashboardShell>
    )
}