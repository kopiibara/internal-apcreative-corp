"use client"

import { DateTimePicker } from "@/components/ui/date-time-picker"

type ScheduledDatePickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function ScheduledDatePicker({
  value,
  onChange,
  disabled,
}: ScheduledDatePickerProps) {
  return (
    <DateTimePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Select scheduled date"
    />
  )
}
