"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { toast } from "sonner"

import { createTask } from "@/app/admin/to-do/actions"
import { TaskAssigneeBrands } from "@/components/to-do/task-assignee-brands"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RequiredLabel } from "@/components/ui/required-label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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
import { cn } from "@/lib/utils"
import type { AccountType } from "@/lib/auth/account-type"
import { determineTaskType, TASK_PRIORITIES } from "@/lib/tasks/task-type"
import type { AssignableProfile } from "@/lib/tasks/tasks"

type TaskCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignees: AssignableProfile[]
  currentProfileId: number
  currentAccountType: AccountType
  permissions: TaskPermissionFlags
  personalOnly?: boolean
  canAssignTeamTasks?: boolean
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  assignees,
  currentProfileId,
  currentAccountType,
  permissions,
  personalOnly = false,
  canAssignTeamTasks = false,
}: TaskCreateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<string>("none")
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false)

  const assigneeOptions = useMemo(() => {
    const map = new Map<number, AssignableProfile>()

    map.set(currentProfileId, {
      id: currentProfileId,
      fullName: "Myself",
      email: "",
      imageUrl: null,
      accountType: currentAccountType,
      status: "ACTIVE",
      brands: [],
    })

    for (const assignee of assignees) {
      map.set(assignee.id, assignee)
    }

    return [...map.values()].sort((left, right) =>
      left.fullName.localeCompare(right.fullName)
    )
  }, [assignees, currentAccountType, currentProfileId])

  const resolvedTaskType = useMemo(
    () =>
      determineTaskType({
        creatorAccountType: currentAccountType,
        creatorProfileId: currentProfileId,
        assignedToProfileIds: personalOnly
          ? [currentProfileId]
          : selectedAssigneeIds,
        canAssignTeamTasks,
      }),
    [
      canAssignTeamTasks,
      currentAccountType,
      currentProfileId,
      personalOnly,
      selectedAssigneeIds,
    ]
  )

  const selectedAssignees = assigneeOptions.filter((assignee) =>
    (personalOnly ? [currentProfileId] : selectedAssigneeIds).includes(
      assignee.id
    )
  )

  function toggleAssignee(assigneeId: number) {
    if (personalOnly) {
      return
    }

    setSelectedAssigneeIds((current) => {
      if (current.includes(assigneeId)) {
        return current.filter((id) => id !== assigneeId)
      }

      setAssigneePickerOpen(false)
      return [...current, assigneeId]
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!personalOnly && selectedAssigneeIds.length === 0) {
      toast.error("Select at least one assignee.")
      return
    }

    startTransition(async () => {
      const result = await createTask({
        title,
        description,
        assignedToProfileIds: personalOnly
          ? [currentProfileId]
          : selectedAssigneeIds,
        dueDate,
        priority: priority === "none" ? null : priority,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        setTitle("")
        setDescription("")
        setSelectedAssigneeIds([])
        setDueDate(null)
        setPriority("none")
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  const requiresDueDate = resolvedTaskType === "GRADED"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {personalOnly ? "Create Personal Task" : "Create Task"}
          </DialogTitle>
          <DialogDescription>
            {personalOnly
              ? "Personal tasks are private, assigned only to you, and are hidden from admin review boards."
              : canAssignTeamTasks
                ? "Assign graded work to Multimedia or Content Creator accounts on your shared brands."
                : resolvedTaskType === "GRADED"
                  ? "This task will count toward staff accountability scoring."
                  : "Personal tasks do not count toward staff accountability scoring."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="task-title" required>
              Title
            </RequiredLabel>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <RichTextEditor
            id="task-description"
            label="Description"
            value={description}
            onChange={setDescription}
            disabled={isPending}
            minHeight={140}
            placeholder="Add task context, instructions, links, or checklist items."
          />

          {!personalOnly ? (
            <div className="space-y-2">
              <RequiredLabel required>
                Assign to ({selectedAssigneeIds.length} selected)
              </RequiredLabel>
              <Popover
                open={assigneePickerOpen}
                onOpenChange={setAssigneePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="neutral"
                    className="w-full justify-between"
                    disabled={isPending}
                  >
                    Select employees
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={6}
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  onWheel={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                >
                  <div
                    className="max-h-[min(300px,50vh)] overflow-y-auto overscroll-contain p-2 pr-1"
                    onWheel={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                  >
                    {assigneeOptions.map((assignee) => {
                      const isSelected = selectedAssigneeIds.includes(assignee.id)

                      return (
                        <Button
                          key={assignee.id}
                          type="button"
                          variant="ghost"
                          className={cn(
                            "h-auto w-full items-start justify-start gap-2 rounded-lg px-2 py-2 text-left text-sm font-normal",
                            isSelected && "bg-accent"
                          )}
                          onClick={() => toggleAssignee(assignee.id)}
                          disabled={
                            isPending ||
                            (!permissions.canAssign &&
                              assignee.id !== currentProfileId)
                          }
                        >
                          <Check
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <UserAvatar
                            profileId={assignee.id}
                            name={assignee.fullName}
                            imageUrl={assignee.imageUrl}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">
                              {assignee.fullName}
                            </span>
                            <TaskAssigneeBrands
                              brands={assignee.brands}
                              hasAllBrandsAccess={assignee.hasAllBrandsAccess}
                              className="mt-1"
                            />
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="space-y-2">
                {selectedAssignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="rounded-lg border bg-muted/20 px-4 py-2 pb-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex flex-row items-center gap-3 text-sm font-medium">
                        <UserAvatar
                          profileId={assignee.id}
                          name={assignee.fullName}
                          imageUrl={assignee.imageUrl}
                          size="sm"
                        />
                        {assignee.fullName}
                        <TaskAssigneeBrands
                          brands={assignee.brands}
                          hasAllBrandsAccess={assignee.hasAllBrandsAccess}
                          className="mt-1"
                        />
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleAssignee(assignee.id)}
                        disabled={isPending}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <RequiredLabel required={requiresDueDate}>
              Due date
            </RequiredLabel>
            <DateTimePicker
              value={dueDate}
              onChange={setDueDate}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel>Priority</RequiredLabel>
            <Select value={priority} onValueChange={setPriority} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Optional priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No priority</SelectItem>
                {TASK_PRIORITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Badge variant="secondary">
            {resolvedTaskType === "GRADED" ? "Graded task" : "Personal task"}
          </Badge>

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
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
