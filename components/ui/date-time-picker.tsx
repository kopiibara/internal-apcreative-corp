"use client"

import { CalendarIcon, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { neoFilterTriggerClass } from "@/lib/neo-ui"
import { cn } from "@/lib/utils"

type DateTimePickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  placeholder?: string
  minDate?: Date
}

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1))
const minutes = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0")
)
const meridiems = ["AM", "PM"] as const

function parseDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function getTimeParts(date: Date | null) {
  const source = date ?? new Date()
  const hour24 = source.getHours()
  const hour12 = hour24 % 12 || 12
  const minute = String(Math.round(source.getMinutes() / 5) * 5).padStart(2, "0")

  return {
    hour: String(hour12),
    minute: minute === "60" ? "55" : minute,
    meridiem: hour24 >= 12 ? "PM" : "AM",
  }
}

function applyTimeParts({
  date,
  hour,
  minute,
  meridiem,
}: {
  date: Date
  hour: string
  minute: string
  meridiem: string
}) {
  const nextDate = new Date(date)
  const hourNumber = Number(hour)
  const hour24 =
    meridiem === "PM"
      ? hourNumber === 12
        ? 12
        : hourNumber + 12
      : hourNumber === 12
        ? 0
        : hourNumber

  nextDate.setHours(hour24, Number(minute), 0, 0)

  return nextDate
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select scheduled date",
  minDate,
}: DateTimePickerProps) {
  const selectedDate = parseDate(value)
  const timeParts = getTimeParts(selectedDate)

  function updateDate(date: Date | undefined) {
    if (!date) {
      return
    }

    const nextDate = applyTimeParts({
      date,
      hour: timeParts.hour,
      minute: timeParts.minute,
      meridiem: timeParts.meridiem,
    })

    onChange(nextDate.toISOString())
  }

  function updateTime(nextTimeParts: Partial<typeof timeParts>) {
    const baseDate = selectedDate ?? new Date()
    const nextDate = applyTimeParts({
      date: baseDate,
      hour: nextTimeParts.hour ?? timeParts.hour,
      minute: nextTimeParts.minute ?? timeParts.minute,
      meridiem: nextTimeParts.meridiem ?? timeParts.meridiem,
    })

    onChange(nextDate.toISOString())
  }

  return (
    <Popover>
      <div className="flex gap-2">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              neoFilterTriggerClass,
              "min-w-0 flex-1 justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="size-4" />
            {selectedDate ? displayFormatter.format(selectedDate) : placeholder}
          </Button>
        </PopoverTrigger>
        {selectedDate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Clear scheduled date"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={updateDate}
          disabled={minDate ? { before: minDate } : undefined}
        />
        <div className="grid grid-cols-3 gap-2 border-t p-3">
          <Select
            value={timeParts.hour}
            onValueChange={(hour) => updateTime({ hour })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeParts.minute}
            onValueChange={(minute) => updateTime({ minute })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((minute) => (
                <SelectItem key={minute} value={minute}>
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeParts.meridiem}
            onValueChange={(meridiem) => updateTime({ meridiem })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent>
              {meridiems.map((meridiem) => (
                <SelectItem key={meridiem} value={meridiem}>
                  {meridiem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
