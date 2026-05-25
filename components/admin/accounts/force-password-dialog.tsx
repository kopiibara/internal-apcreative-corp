"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { forceChangeAccountPassword } from "@/app/admin/account-control/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AccountListItem } from "@/lib/auth/accounts"

type ForcePasswordDialogProps = {
  account: AccountListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForcePasswordDialog({
  account,
  open,
  onOpenChange,
}: ForcePasswordDialogProps) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [requirePasswordChange, setRequirePasswordChange] = useState(true)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setReason("")
    setRequirePasswordChange(true)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!account) {
      return
    }

    startTransition(async () => {
      const result = await forceChangeAccountPassword({
        profileId: account.id,
        requirePasswordChange,
        reason,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Force Change Password</DialogTitle>
          <DialogDescription>
            This will reset the selected account password back to the system
            default password. The password value will not be shown or stored in
            logs.
            {account ? (
              <>
                {" "}
                Target: {account.fullName} ({account.email}).
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2 rounded-lg border-2 border-black p-3 text-sm font-medium">
            <Checkbox
              checked={requirePasswordChange}
              onCheckedChange={(checked) =>
                setRequirePasswordChange(checked === true)
              }
              disabled={isPending}
            />
            Require user to change password on next login
          </label>

          <div className="space-y-2">
            <Label htmlFor="force-password-reason">Reason</Label>
            <Textarea
              id="force-password-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional account recovery note"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Resetting..." : "Reset to Default Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
