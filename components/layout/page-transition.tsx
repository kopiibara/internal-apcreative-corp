"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { usePathname } from "next/navigation"

type PageTransitionProps = {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className="min-h-0 min-w-0 flex-1">{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="min-h-0 min-w-0 flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
