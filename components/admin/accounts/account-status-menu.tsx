"use client"

import { KeyRound, MoreHorizontal, Pencil, ShieldOff, Trash2 } from "lucide-react"

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
  const openForcePasswordDialog = useAccountStore(
    (state) => state.openForcePasswordDialog
  )
  const openSoftDeleteDialog = useAccountStore(
    (state) => state.openSoftDeleteDialog
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open account actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" >
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            openEditDialog(account)
          }}
          className="flex flex-row gap-2 "
        >
          <Pencil className="size-4" />
          Edit account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            openForcePasswordDialog(account)
          }}
          disabled={account.status === "DELETED"}
          className="flex flex-row gap-2"
        >
          <KeyRound className="size-4" />
          Force change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation()
            openDisableDialog(account)
          }}
          disabled={account.status === "DISABLED" || account.status === "DELETED"}
          className="flex flex-row gap-2"
        >
          <ShieldOff className="size-4" />
          Disable account
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation()
            openSoftDeleteDialog(account)
          }}
          disabled={account.status === "DELETED"}
          className="flex flex-row gap-2"
        >
          <Trash2 className="size-4" />
          Soft delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
