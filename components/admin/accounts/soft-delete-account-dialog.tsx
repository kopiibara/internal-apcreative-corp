"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { softDeleteAccount } from "@/app/admin/account-control/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AccountListItem } from "@/lib/auth/accounts"

type SoftDeleteAccountDialogProps = {
  account: AccountListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SoftDeleteAccountDialog({
  account,
  open,
  onOpenChange,
}: SoftDeleteAccountDialogProps) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSoftDelete() {
    if (!account) {
      return
    }

    startTransition(async () => {
      const result = await softDeleteAccount({
        profileId: account.id,
        reason,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setReason("")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setReason("")
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Soft Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            {account
              ? `${account.fullName} (${account.email}) will be deactivated and blocked from dashboard access. Historical records, logs, tasks, reports, and approvals will remain.`
              : "This account will be deactivated and historical records will remain."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="soft-delete-reason">Reason</Label>
          <Textarea
            id="soft-delete-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional reason"
            disabled={isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSoftDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Soft Delete Account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
