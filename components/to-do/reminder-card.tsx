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
import { RichTextPreview } from "@/components/ui/rich-text-renderer"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import type { ReminderRecord } from "@/lib/reminders/reminders"
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
      className="cursor-pointer rounded-lg px-2 py-2 transition-all hover:bg-muted/40 hover:-translate-y-0.5"
      onClick={() => openEditDialog(reminder)}
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between ">
          <h1 className="line-clamp-2 font-medium leading-snug">
            {reminder.title}
          </h1>
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
          <RichTextPreview
            value={reminder.description}
            onSeeMore={() => openEditDialog(reminder)}
          />
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <ReminderStatusBadge status={reminder.status} />
          <StatusBadge status={reminder.priority} type="priority" prefix="Priority" />
        </div>

        <p className="text-xs">
          <span className="text-muted-foreground">Remind:</span>{" "}
          {reminder.remindAt
            ? formatRecentOrDateTime(reminder.remindAt, dateFormatter)
            : "No date"}
        </p>
        <p className="text-xs text-muted-foreground">
          Created {formatRecentOrDateTime(reminder.createdAt, dateFormatter)}
        </p>
      </CardContent>
    </Card>
  )
}
