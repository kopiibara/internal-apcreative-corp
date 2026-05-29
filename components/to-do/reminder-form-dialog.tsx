"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createReminder,
  updateReminder,
} from "@/app/admin/to-do/reminders/actions"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  normalizeRichTextForStorage,
  isRichTextEmpty,
} from "@/lib/rich-text/rich-text"
import {
  REMINDER_PRIORITIES,
  type ReminderPriority,
} from "@/lib/reminders/reminder-statuses"
import type { ReminderRecord } from "@/lib/reminders/reminders"

type ReminderFormDialogProps = {
  reminder?: ReminderRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderFormDialog({
  reminder,
  open,
  onOpenChange,
}: ReminderFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(reminder?.title ?? "")
  const [description, setDescription] = useState(reminder?.description ?? "")
  const [remindAt, setRemindAt] = useState<string | null>(
    reminder?.remindAt ?? null
  )
  const [priority, setPriority] = useState<ReminderPriority>(
    reminder?.priority ?? "MEDIUM"
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const normalizedDescription = isRichTextEmpty(description)
        ? null
        : normalizeRichTextForStorage(description)

      const payload = {
        title,
        description: normalizedDescription,
        remindAt,
        priority,
      }
      const result = reminder
        ? await updateReminder({ reminderId: reminder.id, ...payload })
        : await createReminder(payload)

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {reminder ? "Edit Reminder" : "Create Reminder"}
          </DialogTitle>
          <DialogDescription>
            Keep a personal follow-up visible on your Reminder board.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <RichTextEditor
            id="reminder-description"
            label="Description"
            value={description}
            onChange={setDescription}
            disabled={isPending}
            minHeight={120}
            placeholder="Optional details for this reminder"
          />

          <div className="space-y-2">
            <Label>Remind date and time</Label>
            <DateTimePicker
              value={remindAt}
              onChange={setRemindAt}
              disabled={isPending}
              placeholder="Optional reminder date"
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as ReminderPriority)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_PRIORITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
