"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type ApprovalDeepLinkOpenerProps = {
  reports: ContentReport[]
  approvalId?: string
}

export function ApprovalDeepLinkOpener({
  reports,
  approvalId,
}: ApprovalDeepLinkOpenerProps) {
  const router = useRouter()
  const { openDetailsSheet } = useApprovalStore()
  const handledApprovalId = useRef<string | null>(null)

  useEffect(() => {
    if (!approvalId || handledApprovalId.current === approvalId) {
      return
    }

    const parsedId = Number(approvalId)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      toast.error("Approval request not found.")
      handledApprovalId.current = approvalId
      router.replace("/admin/approvals")
      return
    }

    const report = reports.find((entry) => entry.id === parsedId)

    if (!report) {
      toast.error("Approval request not found.")
      handledApprovalId.current = approvalId
      router.replace("/admin/approvals")
      return
    }

    openDetailsSheet(report)
    handledApprovalId.current = approvalId
    router.replace("/admin/approvals")
  }, [approvalId, openDetailsSheet, reports, router])

  return null
}
