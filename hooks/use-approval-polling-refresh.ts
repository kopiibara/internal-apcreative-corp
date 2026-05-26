"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export function useApprovalPollingRefresh(intervalMs = 4000) {
  const router = useRouter()
  const lastRefreshAtRef = useRef(0)

  useEffect(() => {
    function refreshApprovals() {
      const now = Date.now()

      if (document.visibilityState !== "visible") {
        return
      }

      if (now - lastRefreshAtRef.current < 3000) {
        return
      }

      lastRefreshAtRef.current = now
      router.refresh()
    }

    const intervalId = window.setInterval(refreshApprovals, intervalMs)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshApprovals()
      }
    }

    window.addEventListener("focus", refreshApprovals)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", refreshApprovals)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [intervalMs, router])
}
