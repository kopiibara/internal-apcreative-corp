"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { neoFilterTriggerClass } from "@/lib/neo-ui"
import { cn } from "@/lib/utils"
import {
  formatDateKeyInPhilippines,
  getPhilippineDayBounds,
} from "@/lib/daily-report-filters"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
})

function parseDateKey(value: string) {
  const { start } = getPhilippineDayBounds(value)
  return Number.isNaN(start.getTime()) ? null : start
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateKey(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            neoFilterTriggerClass,
            "min-w-[180px] justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          {selectedDate
            ? displayFormatter.format(selectedDate)
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(date) => {
            if (!date) {
              return
            }

            onChange(formatDateKeyInPhilippines(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
