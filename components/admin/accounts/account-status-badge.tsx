import { StatusBadge } from "@/components/shared/status-badge"
import type { ProfileStatus } from "@/app/admin/account-control/schema"
import type { AccountType } from "@/lib/account-type"

type AccountStatusBadgeProps = {
  status: ProfileStatus
}

type AccountTypeBadgeProps = {
  accountType: AccountType
}

export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  return <StatusBadge status={status} type="account" />
}

export function AccountTypeBadge({ accountType }: AccountTypeBadgeProps) {
  return <StatusBadge status={accountType} type="account" />
}
