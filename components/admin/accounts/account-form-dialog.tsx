"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createAccount,
  updateAccount,
} from "@/app/admin/account-control/actions"
import { profileStatuses, type ProfileStatus } from "@/app/admin/account-control/schema"
import {
  AccountBrandAccess,
  type EditableBrandAssignment,
} from "@/components/admin/accounts/account-brand-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CLIENT_VIEWER_DEPARTMENT,
  DEFAULT_DEPARTMENT,
} from "@/lib/auth/account-defaults"
import { getRoleDashboardHint, getSystemAccessLabel } from "@/lib/auth/account-type"
import type { AccountListItem, BrandOption, RoleOption } from "@/lib/auth/accounts"

const clientViewerSlugs = new Set(["client-viewer", "client_viewer"])

type AccountFormDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: AccountListItem | null
  brands: BrandOption[]
  roles: RoleOption[]
}

type FormState = {
  fullName: string
  email: string
  department: string
  phoneNumber: string
  status: ProfileStatus
}

function getDefaultFormState(): FormState {
  return {
    fullName: "",
    email: "",
    department: DEFAULT_DEPARTMENT,
    phoneNumber: "",
    status: "ACTIVE",
  }
}

function getDefaultAssignments(): EditableBrandAssignment[] {
  return [
    {
      id: crypto.randomUUID(),
      brandId: "",
      roleId: "",
      isPrimary: true,
      isActive: true,
    },
  ]
}

function getPrimaryRoleName(
  account: AccountListItem,
  roles: RoleOption[]
): string | null {
  const primaryAccess =
    account.brandAccess.find((access) => access.isPrimary && access.isActive) ??
    account.brandAccess.find((access) => access.isActive)

  if (!primaryAccess) {
    return null
  }

  return (
    roles.find((role) => role.id === primaryAccess.roleId)?.name ??
    primaryAccess.roleName
  )
}

export function AccountFormDialog({
  mode,
  open,
  onOpenChange,
  account,
  brands,
  roles,
}: AccountFormDialogProps) {
  const router = useRouter()
  const isCreateMode = mode === "create"
  const [formState, setFormState] = useState<FormState>(() => {
    if (isCreateMode || !account) {
      return getDefaultFormState()
    }

    return {
      fullName: account.fullName,
      email: account.email,
      department: account.department ?? "",
      phoneNumber: account.phoneNumber ?? "",
      status: account.status,
    }
  })
  const [brandAssignments, setBrandAssignments] = useState<
    EditableBrandAssignment[]
  >(getDefaultAssignments)
  const [isPending, startTransition] = useTransition()

  const title = isCreateMode ? "Create Account" : "Edit Account"
  const description = isCreateMode
    ? "Create a login user, profile, and brand access in one flow."
    : "Update profile details and manage assigned brand access."

  const selectedBrandIds = useMemo(
    () =>
      brandAssignments
        .map((assignment) => assignment.brandId)
        .filter((brandId) => brandId.length > 0),
    [brandAssignments]
  )

  const selectedRoleSlugs = useMemo(
    () =>
      brandAssignments
        .map(
          (assignment) =>
            roles.find((role) => String(role.id) === assignment.roleId)?.slug
        )
        .filter((slug): slug is string => Boolean(slug)),
    [brandAssignments, roles]
  )

  const hasClientViewerRole = useMemo(
    () => selectedRoleSlugs.some((slug) => clientViewerSlugs.has(slug)),
    [selectedRoleSlugs]
  )

  const canEditDepartment = !isCreateMode || hasClientViewerRole

  const roleDashboardHint = useMemo(
    () =>
      selectedRoleSlugs.length > 0
        ? getRoleDashboardHint(selectedRoleSlugs)
        : null,
    [selectedRoleSlugs]
  )

  const editPrimaryRoleName =
    !isCreateMode && account ? getPrimaryRoleName(account, roles) : null

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key]
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleBrandAssignmentsChange(
    nextAssignments: EditableBrandAssignment[]
  ) {
    setBrandAssignments(nextAssignments)

    if (!isCreateMode) {
      return
    }

    const nextHasClientViewerRole = nextAssignments.some((assignment) => {
      const role = roles.find((item) => String(item.id) === assignment.roleId)

      return role ? clientViewerSlugs.has(role.slug) : false
    })

    setFormState((current) => {
      if (!nextHasClientViewerRole) {
        return {
          ...current,
          department: DEFAULT_DEPARTMENT,
        }
      }

      if (current.department && current.department !== DEFAULT_DEPARTMENT) {
        return current
      }

      return {
        ...current,
        department: CLIENT_VIEWER_DEPARTMENT,
      }
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = isCreateMode
        ? await createAccount({
          fullName: formState.fullName,
          email: formState.email,
          department: formState.department,
          phoneNumber: formState.phoneNumber,
          status: formState.status,
          brandAssignments: brandAssignments
            .filter(
              (assignment) => assignment.brandId && assignment.roleId
            )
            .map((assignment) => ({
              brandId: Number(assignment.brandId),
              roleId: Number(assignment.roleId),
              isPrimary: assignment.isPrimary,
              isActive: assignment.isActive,
            })),
        })
        : await updateAccount({
          profileId: account?.id,
          fullName: formState.fullName,
          department: formState.department,
          phoneNumber: formState.phoneNumber,
          status: formState.status,
        })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="space-y-5">
            <section className="space-y-1">
              <div className="text-sm font-medium">Basic account information</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-full-name`}>Full name</Label>
                  <Input
                    id={`${mode}-full-name`}
                    value={formState.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${mode}-email`}>Email</Label>
                  <Input
                    id={`${mode}-email`}
                    type="email"
                    value={formState.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    disabled={!isCreateMode}
                    required
                  />
                </div>

                {isCreateMode ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`${mode}-password`}>Temporary password</Label>
                    <Input
                      id={`${mode}-password`}
                      value=""
                      disabled
                      readOnly
                      placeholder="Default temporary password will be assigned automatically."
                    />
                    <p className="text-xs text-muted-foreground">
                      Default temporary password will be assigned automatically.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            {!isCreateMode && account ? (
              <section className="space-y-2 rounded-xl border p-3">
                <div className="text-sm font-medium">System access</div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium">
                    {editPrimaryRoleName ?? "No active role"}
                  </span>
                  <Badge variant="neutral">
                    {getSystemAccessLabel(account.accountType)}
                  </Badge>
                </div>
              </section>
            ) : null}

            <Separator />

            <section className="space-y-3">
              <div className="text-sm font-medium">Department and contact</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-department`}>Department</Label>
                  <Input
                    id={`${mode}-department`}
                    value={formState.department}
                    onChange={(event) =>
                      updateField("department", event.target.value)
                    }
                    disabled={!canEditDepartment}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${mode}-phone`}>Phone</Label>
                  <Input
                    id={`${mode}-phone`}
                    value={formState.phoneNumber}
                    onChange={(event) =>
                      updateField("phoneNumber", event.target.value)
                    }
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4 pt-2">
              {isCreateMode ? (
                <AccountBrandAccess
                  mode="create"
                  brands={brands}
                  roles={roles}
                  assignments={brandAssignments}
                  onAssignmentsChange={handleBrandAssignmentsChange}
                />
              ) : account ? (
                <AccountBrandAccess
                  mode="edit"
                  profileId={account.id}
                  brands={brands}
                  roles={roles}
                  access={account.brandAccess}
                />
              ) : null}

              {isCreateMode && roleDashboardHint ? (
                <p className="text-xs text-muted-foreground">{roleDashboardHint}</p>
              ) : null}

              {isCreateMode && selectedBrandIds.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Duplicate brand selection is blocked here and validated again on
                  the server.
                </p>
              ) : null}
            </section>

            <Separator />

            <section className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  updateField("status", value as ProfileStatus)
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {profileStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          </DialogBody>

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
              {isPending ? "Saving..." : "Save Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
