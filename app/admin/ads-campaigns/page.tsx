import { AdminAdsCampaignsDashboard } from "@/components/admin/ads-campaigns/admin-ads-campaigns-dashboard"
import { getAdminAdsCampaignPageData } from "@/lib/ads-campaigns"
import { requireAdmin } from "@/lib/auth/auth-session"

export default async function AdminAdsCampaignsPage() {
  const { profile } = await requireAdmin()
  const data = await getAdminAdsCampaignPageData(profile)

  return <AdminAdsCampaignsDashboard {...data} />
}
