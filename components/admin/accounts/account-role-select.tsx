"use client"

import type { RoleOption } from "@/lib/accounts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AccountRoleSelectProps = {
  roles: RoleOption[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function AccountRoleSelect({
  roles,
  value,
  onValueChange,
  disabled,
}: AccountRoleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.id} value={String(role.id)}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
