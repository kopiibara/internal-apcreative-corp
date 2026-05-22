import * as React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function BoardSection({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "flex min-h-0 min-w-0 flex-col bg-card shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { BoardSection }
