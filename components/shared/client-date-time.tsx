"use client"

import { useEffect, useState } from "react"

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

type ClientDateTimeProps = {
  value: string | Date | null | undefined
  placeholder?: string
  className?: string
}

/** Renders locale-formatted dates only after mount to avoid hydration mismatch. */
export function ClientDateTime({
  value,
  placeholder = "—",
  className,
}: ClientDateTimeProps) {
  const [label, setLabel] = useState(placeholder)

  useEffect(() => {
    if (!value) {
      setLabel(placeholder)
      return
    }

    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      setLabel(placeholder)
      return
    }

    setLabel(dateTimeFormatter.format(date))
  }, [value, placeholder])

  return <span className={className}>{label}</span>
}
