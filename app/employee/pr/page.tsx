import { redirect } from "next/navigation";

import { PRDashboard } from "@/components/pr/pr-dashboard";
import { requireEmployee } from "@/lib/auth/auth-session";
import {
  canAccessPRPage,
  canViewAllPRRequests,
  getPRAccessFlags,
} from "@/lib/pr/pr-permissions";
import {
  getActivePRBrands,
  getPRRequesterOptions,
  getPRRequestsForViewer,
} from "@/lib/pr/pr-requests";

export default async function EmployeePRPage() {
  const { profile } = await requireEmployee();

  const canAccess = await canAccessPRPage(profile);

  if (!canAccess) {
    redirect("/employee/unauthorized?permission=pr_requests.view_all");
  }

  const access = await getPRAccessFlags(profile.auth_user_id);
  const canViewAll = await canViewAllPRRequests(profile);

  const [brands, requesterOptions, requests] = await Promise.all([
    getActivePRBrands(),
    getPRRequesterOptions(),
    getPRRequestsForViewer({
      profileId: profile.id,
      accountType: profile.account_type,
      canViewAll,
    }),
  ]);

  return (
    <PRDashboard
      requests={requests}
      brands={brands}
      requesterOptions={requesterOptions}
      currentProfileId={profile.id}
      canCreate={access.canCreate}
      canManage={access.canManage}
      readOnlyMode={access.canReadOnlyMode}
    />
  );
}
