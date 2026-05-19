import { requireEmployee } from "@/lib/auth-session"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { profile } = await requireEmployee()

    return (
        <DashboardShell
            role="employee"
            title="Employee Dashboard"
            user={{
                name: profile.full_name,
                email: profile.email,
                accountType: profile.account_type,
                mustChangePassword: profile.must_change_password,
            }}
        >
            {children}
        </DashboardShell>
    )
}