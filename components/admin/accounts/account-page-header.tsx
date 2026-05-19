"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAccountStore } from "@/stores/use-account-store"

export function AccountPageHeader() {
  const openCreateDialog = useAccountStore((state) => state.openCreateDialog)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          Account Control
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage dashboard login accounts, profile details, brands, and roles.
        </p>
      </div>

      <Button onClick={openCreateDialog}>
        <Plus className="size-4" />
        Create Account
      </Button>
    </div>
  )
}
