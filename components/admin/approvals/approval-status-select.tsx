"use client"

import { reviewStatuses } from "@/app/employee/approvals/schema"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ApprovalStatusSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function ApprovalStatusSelect({
  value,
  onValueChange,
  disabled,
}: ApprovalStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {reviewStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
