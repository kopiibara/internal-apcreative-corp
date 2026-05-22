"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import {
  archiveReminder,
  markReminderDone,
  updateReminderStatus,
} from "@/app/admin/to-do/reminders/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { ReminderStatusBadge } from "@/components/to-do/reminder-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ReminderRecord } from "@/lib/reminders"
import { useReminderStore } from "@/stores/use-reminder-store"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function ReminderCard({ reminder }: { reminder: ReminderRecord }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const openEditDialog = useReminderStore((state) => state.openEditDialog)

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Card
      size="sm"
      className="cursor-pointer rounded-md py-2 transition-colors hover:bg-muted/40"
      onClick={() => openEditDialog(reminder)}
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between ">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {reminder.title}
          </p>
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Reminder actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(reminder)}>
                  View / Edit
                </DropdownMenuItem>
                {reminder.status !== "DONE" ? (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(() => markReminderDone({ reminderId: reminder.id }))
                    }
                  >
                    Mark as Done
                  </DropdownMenuItem>
                ) : null}
                {reminder.status !== "PENDING" ? (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(() =>
                        updateReminderStatus({
                          reminderId: reminder.id,
                          status: "PENDING",
                        })
                      )
                    }
                  >
                    Move to Pending
                  </DropdownMenuItem>
                ) : null}
                {reminder.status !== "ARCHIVED" ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      runAction(() => archiveReminder({ reminderId: reminder.id }))
                    }
                  >
                    Archive
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {reminder.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {reminder.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <ReminderStatusBadge status={reminder.status} />
          <StatusBadge status={reminder.priority} type="priority" prefix="Priority" />
        </div>

        <p className="text-xs">
          <span className="text-muted-foreground">Remind:</span>{" "}
          {reminder.remindAt
            ? dateFormatter.format(new Date(reminder.remindAt))
            : "No date"}
        </p>
        <p className="text-xs text-muted-foreground">
          Created {dateFormatter.format(new Date(reminder.createdAt))}
        </p>
      </CardContent>
    </Card>
  )
}
