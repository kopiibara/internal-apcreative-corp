import { Badge } from "@/components/ui/badge"
import type { ProfileStatus } from "@/app/admin/account-control/schema"
import type { AccountType } from "@/lib/account-type"

type AccountStatusBadgeProps = {
  status: ProfileStatus
}

type AccountTypeBadgeProps = {
  accountType: AccountType
}

export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  const variant = status === "ACTIVE" ? "default" : "outline"

  return <Badge variant={variant}>{status}</Badge>
}

export function AccountTypeBadge({ accountType }: AccountTypeBadgeProps) {
  return <Badge variant="outline">{accountType}</Badge>
}
