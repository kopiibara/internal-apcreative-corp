"use client"

import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
import type { TaskProofType } from "@/lib/tasks/task-type"
type TaskProofViewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofType: TaskProofType | null
  proofUrl: string | null
  proofNote?: string | null
  taskTitle?: string | null
}

function proofDialogTitle(proofType: TaskProofType | ProofSubmitType | null) {
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{proofDialogTitle(proofType)}</DialogTitle>
          {taskTitle ? (
            <DialogDescription>{taskTitle}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogBody>
          <TaskProofDisplay
            proofType={proofType}
            proofUrl={proofUrl}
            proofNote={proofNote}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
