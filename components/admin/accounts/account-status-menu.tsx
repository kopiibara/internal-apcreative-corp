"use client"

import { MoreHorizontal, Pencil, ShieldOff } from "lucide-react"

import type { AccountListItem } from "@/lib/auth/accounts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccountStore } from "@/stores/use-account-store"

type AccountStatusMenuProps = {
  account: AccountListItem
}

export function AccountStatusMenu({ account }: AccountStatusMenuProps) {
  const openEditDialog = useAccountStore((state) => state.openEditDialog)
  const openDisableDialog = useAccountStore((state) => state.openDisableDialog)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open account actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openEditDialog(account)}>
          <Pencil className="size-4" />
          Edit account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => openDisableDialog(account)}
          disabled={account.status === "DISABLED"}
        >
          <ShieldOff className="size-4" />
          Disable account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
