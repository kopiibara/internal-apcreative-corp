"use client"

import { contentTypes } from "@/app/employee/approvals/schema"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ContentTypeSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function ContentTypeSelect({
  value,
  onValueChange,
  disabled,
}: ContentTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select content type" />
      </SelectTrigger>
      <SelectContent>
        {contentTypes.map((contentType) => (
          <SelectItem key={contentType} value={contentType}>
            {contentType}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
