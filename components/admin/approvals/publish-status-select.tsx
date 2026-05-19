"use client"

import { publishStatuses } from "@/app/employee/approvals/schema"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PublishStatusSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function PublishStatusSelect({
  value,
  onValueChange,
  disabled,
}: PublishStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select publish status" />
      </SelectTrigger>
      <SelectContent>
        {publishStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
