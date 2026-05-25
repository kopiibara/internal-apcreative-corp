import { AdsCampaignsDashboard } from "@/components/employee/ads-campaigns/ads-campaigns-dashboard"
import { requireEmployee } from "@/lib/auth/auth-session"
import { getEmployeeAdsCampaignPageData } from "@/lib/ads-campaigns"
import { can } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function EmployeeAdsCampaignsPage() {
  const { profile } = await requireEmployee()
  const allowed = await can(profile.auth_user_id, "ads_campaigns.view")

  if (!allowed) {
    redirect("/employee/unauthorized?permission=ads_campaigns.view")
  }

  const data = await getEmployeeAdsCampaignPageData(profile)

  return <AdsCampaignsDashboard {...data} />
}
