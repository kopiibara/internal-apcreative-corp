import "server-only"

import { isEmployeeAccountType, type AccountType } from "@/lib/account-type"
import { query } from "@/lib/db"
import { can } from "@/lib/permissions"

export async function canAccessEmployeeTaskPage(
  authUserId: string,
  accountType: AccountType,
  profileId: number
) {
  if (!isEmployeeAccountType(accountType)) {
    return false
  }

  if (await can(authUserId, "tasks.view")) {
    return true
  }

  const brandAccess = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access
      WHERE profile_id = $1
        AND is_active = true
    ) AS has_access
    `,
    [profileId]
  )

  return Boolean(brandAccess.rows[0]?.has_access)
}
