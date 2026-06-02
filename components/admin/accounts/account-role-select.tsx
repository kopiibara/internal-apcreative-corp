"use client"

import type { RoleOption } from "@/lib/auth/accounts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type AccountRoleSelectProps = {
  roles: RoleOption[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function AccountRoleSelect({
  roles,
  value,
  onValueChange,
  disabled,
  className,
}: AccountRoleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("min-w-0", className)}>
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
