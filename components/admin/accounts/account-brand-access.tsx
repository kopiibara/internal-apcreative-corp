"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import {
  assignBrandAccess,
  removeBrandAccess,
} from "@/app/admin/account-control/actions"
import { AccountRoleSelect } from "@/components/admin/accounts/account-role-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AccountBrandAccess,
  BrandOption,
  RoleOption,
} from "@/lib/accounts"

export type EditableBrandAssignment = {
  id: string
  brandId: string
  roleId: string
  isPrimary: boolean
  isActive: boolean
}

type CreateBrandAccessProps = {
  mode: "create"
  brands: BrandOption[]
  roles: RoleOption[]
  assignments: EditableBrandAssignment[]
  onAssignmentsChange: (assignments: EditableBrandAssignment[]) => void
}

type EditBrandAccessProps = {
  mode: "edit"
  profileId: number
  brands: BrandOption[]
  roles: RoleOption[]
  access: AccountBrandAccess[]
}

type AccountBrandAccessProps = CreateBrandAccessProps | EditBrandAccessProps

function createEmptyAssignment(): EditableBrandAssignment {
  return {
    id: crypto.randomUUID(),
    brandId: "",
    roleId: "",
    isPrimary: false,
    isActive: true,
  }
}

function BrandSelect({
  brands,
  value,
  onValueChange,
  disabledBrandIds,
  disabled,
}: {
  brands: BrandOption[]
  value: string
  onValueChange: (value: string) => void
  disabledBrandIds: Set<string>
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select brand" />
      </SelectTrigger>
      <SelectContent>
        {brands.map((brand) => (
          <SelectItem
            key={brand.id}
            value={String(brand.id)}
            disabled={disabledBrandIds.has(String(brand.id))}
          >
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AssignmentRow({
  assignment,
  brands,
  roles,
  disabledBrandIds,
  onChange,
  onRemove,
  removeLabel = "Remove",
}: {
  assignment: EditableBrandAssignment
  brands: BrandOption[]
  roles: RoleOption[]
  disabledBrandIds: Set<string>
  onChange: (assignment: EditableBrandAssignment) => void
  onRemove: () => void
  removeLabel?: string
}) {
  return (
    <div className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[1.2fr_1fr_auto_auto_auto] lg:items-center">
      <BrandSelect
        brands={brands}
        value={assignment.brandId}
        onValueChange={(brandId) => onChange({ ...assignment, brandId })}
        disabledBrandIds={disabledBrandIds}
      />

      <AccountRoleSelect
        roles={roles}
        value={assignment.roleId}
        onValueChange={(roleId) => onChange({ ...assignment, roleId })}
      />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={assignment.isPrimary}
          onCheckedChange={(checked) =>
            onChange({ ...assignment, isPrimary: checked === true })
          }
        />
        Primary
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={assignment.isActive}
          onCheckedChange={(checked) =>
            onChange({ ...assignment, isActive: checked === true })
          }
        />
        Active
      </label>

      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="size-4" />
        {removeLabel}
      </Button>
    </div>
  )
}

function CreateBrandAccess({
  brands,
  roles,
  assignments,
  onAssignmentsChange,
}: CreateBrandAccessProps) {
  const selectedBrandIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.brandId)),
    [assignments]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Brand access</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onAssignmentsChange([...assignments, createEmptyAssignment()])
          }
        >
          <Plus className="size-4" />
          Add Brand
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          No brand access rows selected.
        </div>
      ) : (
        assignments.map((assignment) => {
          const disabledBrandIds = new Set(selectedBrandIds)
          disabledBrandIds.delete(assignment.brandId)

          return (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              brands={brands}
              roles={roles}
              disabledBrandIds={disabledBrandIds}
              onChange={(nextAssignment) =>
                onAssignmentsChange(
                  assignments.map((item) =>
                    item.id === assignment.id ? nextAssignment : item
                  )
                )
              }
              onRemove={() =>
                onAssignmentsChange(
                  assignments.filter((item) => item.id !== assignment.id)
                )
              }
            />
          )
        })
      )}
    </div>
  )
}

function EditAccessRow({
  profileId,
  access,
  roles,
}: {
  profileId: number
  access: AccountBrandAccess
  roles: RoleOption[]
}) {
  const router = useRouter()
  const [roleId, setRoleId] = useState(String(access.roleId))
  const [isPrimary, setIsPrimary] = useState(access.isPrimary)
  const [isActive, setIsActive] = useState(access.isActive)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await assignBrandAccess({
        profileId,
        brandId: access.brandId,
        roleId: Number(roleId),
        isPrimary,
        isActive,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeBrandAccess({
        profileId,
        brandId: access.brandId,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <div className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[1.2fr_1fr_auto_auto_auto_auto] lg:items-center">
      <div className="text-sm font-medium">{access.brandName}</div>

      <AccountRoleSelect
        roles={roles}
        value={roleId}
        onValueChange={setRoleId}
        disabled={isPending}
      />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isPrimary}
          onCheckedChange={(checked) => setIsPrimary(checked === true)}
          disabled={isPending}
        />
        Primary
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
          disabled={isPending}
        />
        Active
      </label>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleSave}
      >
        {isPending ? "Saving..." : "Save"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending || !access.isActive}
        onClick={handleRemove}
      >
        <Trash2 className="size-4" />
        Revoke
      </Button>
    </div>
  )
}

function EditBrandAccess({ profileId, brands, roles, access }: EditBrandAccessProps) {
  const router = useRouter()
  const [newAssignment, setNewAssignment] = useState(createEmptyAssignment)
  const [isPending, startTransition] = useTransition()
  const existingBrandIds = useMemo(
    () => new Set(access.map((item) => String(item.brandId))),
    [access]
  )

  function handleAssign() {
    startTransition(async () => {
      const result = await assignBrandAccess({
        profileId,
        brandId: Number(newAssignment.brandId),
        roleId: Number(newAssignment.roleId),
        isPrimary: newAssignment.isPrimary,
        isActive: newAssignment.isActive,
      })

      if (result.success) {
        toast.success(result.message)
        setNewAssignment(createEmptyAssignment())
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <div className="space-y-4">
      <Label>Brand access</Label>

      <div className="space-y-3">
        {access.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No brand access has been assigned.
          </div>
        ) : (
          access.map((item) => (
            <EditAccessRow
              key={item.id}
              profileId={profileId}
              access={item}
              roles={roles}
            />
          ))
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-medium">Assign another brand</div>
        <div className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[1.2fr_1fr_auto_auto_auto] lg:items-center">
          <BrandSelect
            brands={brands}
            value={newAssignment.brandId}
            onValueChange={(brandId) =>
              setNewAssignment({ ...newAssignment, brandId })
            }
            disabledBrandIds={existingBrandIds}
            disabled={isPending}
          />

          <AccountRoleSelect
            roles={roles}
            value={newAssignment.roleId}
            onValueChange={(roleId) =>
              setNewAssignment({ ...newAssignment, roleId })
            }
            disabled={isPending}
          />

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newAssignment.isPrimary}
              onCheckedChange={(checked) =>
                setNewAssignment({
                  ...newAssignment,
                  isPrimary: checked === true,
                })
              }
              disabled={isPending}
            />
            Primary
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newAssignment.isActive}
              onCheckedChange={(checked) =>
                setNewAssignment({
                  ...newAssignment,
                  isActive: checked === true,
                })
              }
              disabled={isPending}
            />
            Active
          </label>

          <Button
            type="button"
            size="sm"
            onClick={handleAssign}
            disabled={
              isPending || !newAssignment.brandId || !newAssignment.roleId
            }
          >
            <Plus className="size-4" />
            Assign
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AccountBrandAccess(props: AccountBrandAccessProps) {
  if (props.mode === "create") {
    return <CreateBrandAccess {...props} />
  }

  return <EditBrandAccess {...props} />
}
