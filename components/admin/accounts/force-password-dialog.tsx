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
import { Input } from "@/components/ui/input"
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
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [reason, setReason] = useState("")
  const [requirePasswordChange, setRequirePasswordChange] = useState(true)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setNewPassword("")
    setConfirmPassword("")
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
        newPassword,
        confirmPassword,
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
            Set a new password for {account?.fullName ?? "this account"}.
            Password values are never written to account logs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="force-new-password">New password</Label>
            <Input
              id="force-new-password"
              type="password"
              value={newPassword}
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="force-confirm-password">Confirm password</Label>
            <Input
              id="force-confirm-password"
              type="password"
              value={confirmPassword}
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isPending}
              required
            />
          </div>

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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
