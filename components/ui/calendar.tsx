"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CalendarProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: {
    before?: Date
  }
}

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})

function startOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

function getCalendarDays(displayMonth: Date) {
  const firstDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  ...props
}: CalendarProps) {
  const [displayMonth, setDisplayMonth] = React.useState(
    selected ?? new Date()
  )
  const calendarDays = getCalendarDays(displayMonth)
  const minimumDate = disabled?.before ? startOfDay(disabled.before) : null

  function updateDisplayMonth(offset: number) {
    setDisplayMonth((current) => {
      const nextDate = new Date(current)
      nextDate.setMonth(current.getMonth() + offset)
      return nextDate
    })
  }

  return (
    <div
      data-slot="calendar"
      className={cn("w-[280px] rounded-2xl bg-background p-3", className)}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => updateDisplayMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium">{monthFormatter.format(displayMonth)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => updateDisplayMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.slice(0, 7).map((date) => (
          <div
            key={date.toISOString()}
            className="py-1 text-xs text-muted-foreground"
          >
            {weekdayFormatter.format(date).slice(0, 2)}
          </div>
        ))}
        {calendarDays.map((date) => {
          const isOutsideMonth = date.getMonth() !== displayMonth.getMonth()
          const isSelected = selected ? isSameDay(date, selected) : false
          const isToday = isSameDay(date, new Date())
          const isDisabled =
            minimumDate !== null && startOfDay(date).getTime() < minimumDate.getTime()

          return (
            <Button
              key={date.toISOString()}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              size="icon-sm"
              disabled={isDisabled}
              className={cn(
                "size-9 rounded-lg text-sm font-normal",
                isOutsideMonth && "text-muted-foreground opacity-50",
                isToday && !isSelected && "bg-muted text-foreground"
              )}
              onClick={() => onSelect?.(date)}
            >
              {date.getDate()}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
