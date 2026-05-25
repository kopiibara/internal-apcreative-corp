import { AccountDataTable } from "@/components/admin/accounts/account-data-table"
import { getAccountManagementData } from "@/lib/auth/accounts"
import { requirePermission } from "@/lib/permissions"

export default async function AccountControlPage() {
  await requirePermission("accounts.view")

  const { accounts, brands, roles } = await getAccountManagementData()

  return <AccountDataTable accounts={accounts} brands={brands} roles={roles} />
}
