import { StaffAccountabilityDashboard } from "@/components/admin/staff-accountability/staff-accountability-dashboard"
import { requirePermission } from "@/lib/permissions"
import { getStaffAccountabilitySummaries } from "@/lib/tasks"

export default async function StaffAccountabilityPage() {
  await requirePermission("tasks.view_all")
  const summaries = await getStaffAccountabilitySummaries()

  return <StaffAccountabilityDashboard summaries={summaries} />
}
