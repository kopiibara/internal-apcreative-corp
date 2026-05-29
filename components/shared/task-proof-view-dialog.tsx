"use client"

import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TaskProofType } from "@/lib/tasks/task-type"
type TaskProofViewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofType: TaskProofType | null
  proofUrl: string | null
  proofNote?: string | null
  taskTitle?: string | null
}

function proofDialogTitle(proofType: TaskProofType | null) {
  if (proofType === "IMAGE") return "Image proof"
  return "Task proof"
}

export function TaskProofViewDialog({
  open,
  onOpenChange,
  proofType,
  proofUrl,
  proofNote,
  taskTitle,
}: TaskProofViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proofDialogTitle(proofType)}</DialogTitle>
          {taskTitle ? (
            <DialogDescription>{taskTitle}</DialogDescription>
          ) : null}
        </DialogHeader>
        <TaskProofDisplay
          proofType={proofType}
          proofUrl={proofUrl}
          proofNote={proofNote}
          mediaClassName="max-h-[min(70vh,640px)]"
        />
      </DialogContent>
    </Dialog>
  )
}
