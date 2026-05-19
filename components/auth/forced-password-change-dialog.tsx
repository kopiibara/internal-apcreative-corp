"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { changeOwnPassword } from "@/app/actions/change-password"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ForcedPasswordChangeDialogProps = {
  mustChangePassword: boolean
}

type FieldErrors = {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export function ForcedPasswordChangeDialog({
  mustChangePassword,
}: ForcedPasswordChangeDialogProps) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isComplete, setIsComplete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isOpen = mustChangePassword && !isComplete

  function validate() {
    const nextErrors: FieldErrors = {}

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required."
    }

    if (newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters."
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password."
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "New password and confirmation must match."
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    startTransition(async () => {
      const result = await changeOwnPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (result.success) {
        toast.success(result.message)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setIsComplete(true)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            This account was created with a temporary password. Set a new
            password before continuing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forced-current-password">Current password</Label>
            <Input
              id="forced-current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={isPending}
              autoComplete="current-password"
              required
            />
            {errors.currentPassword ? (
              <p className="text-sm text-destructive">
                {errors.currentPassword}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forced-new-password">New password</Label>
            <Input
              id="forced-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isPending}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {errors.newPassword ? (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forced-confirm-password">Confirm new password</Label>
            <Input
              id="forced-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isPending}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Changing Password..." : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
