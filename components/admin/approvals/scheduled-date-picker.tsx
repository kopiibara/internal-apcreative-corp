"use client"

import { Input } from "@/components/ui/input"

type ScheduledDatePickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ScheduledDatePicker({
  value,
  onChange,
  disabled,
}: ScheduledDatePickerProps) {
  return (
    <Input
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}
