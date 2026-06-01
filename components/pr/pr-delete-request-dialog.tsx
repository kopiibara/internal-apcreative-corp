"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deletePRRequest } from "@/app/employee/pr/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { PRRequestRecord } from "@/lib/pr/pr-types";

type PRDeleteRequestDialogProps = {
  request: PRRequestRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function PRDeleteRequestDialog({
  request,
  open,
  onOpenChange,
  onDeleted,
}: PRDeleteRequestDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!request) {
      return;
    }

    startTransition(async () => {
      const result = await deletePRRequest({ requestId: request.id });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
      onDeleted?.();
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete PR request</AlertDialogTitle>
          <AlertDialogDescription>
            {request
              ? `This will remove "${request.recommendation}" from the PR tracker.`
              : "This request will be removed from the PR tracker."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !request}
          >
            {isPending ? "Deleting..." : "Delete request"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
