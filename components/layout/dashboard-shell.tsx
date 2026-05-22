"use client"

import { type CSSProperties, useSyncExternalStore } from "react"

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { PageTransition } from "@/components/layout/page-transition"
import { ForcedPasswordChangeDialog } from "@/components/auth/forced-password-change-dialog"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date)
}

const SERVER_DATE_TIME_LABEL = "Loading..."
const dateTimeSubscribers = new Set<() => void>()
let currentDateTimeLabel = SERVER_DATE_TIME_LABEL
let dateTimeIntervalId: number | null = null

function updateDateTimeSnapshot() {
    currentDateTimeLabel = formatDateTime(new Date())
    dateTimeSubscribers.forEach((callback) => callback())
}

function subscribeToDateTime(callback: () => void) {
    dateTimeSubscribers.add(callback)
    updateDateTimeSnapshot()

    if (dateTimeIntervalId === null) {
        dateTimeIntervalId = window.setInterval(updateDateTimeSnapshot, 1000)
    }

    return () => {
        dateTimeSubscribers.delete(callback)

        if (dateTimeSubscribers.size === 0 && dateTimeIntervalId !== null) {
            window.clearInterval(dateTimeIntervalId)
            dateTimeIntervalId = null
        }
    }
}

function getDateTimeSnapshot() {
    return currentDateTimeLabel
}

function getServerDateTimeSnapshot() {
    return SERVER_DATE_TIME_LABEL
}

type DashboardUser = {
    name: string
    email: string
    accountType: string
    roleSlugs?: string[]
    mustChangePassword?: boolean
}

type DashboardShellProps = {
    role: "admin" | "employee"
    title: string
    user: DashboardUser
    employeeActionableTaskCount?: number
    children: React.ReactNode
}

export function DashboardShell({
    role,
    title,
    user,
    employeeActionableTaskCount = 0,
    children,
}: DashboardShellProps) {
    const dateTimeLabel = useSyncExternalStore(
        subscribeToDateTime,
        getDateTimeSnapshot,
        getServerDateTimeSnapshot
    )

    return (
        <TooltipProvider delayDuration={0}>
            <SidebarProvider
                defaultOpen={true}
                className="min-w-0 overflow-hidden"
                style={
                    {
                        "--sidebar-width": "17rem",
                        "--sidebar-width-icon": "4.5rem",
                    } as CSSProperties
                }
            >
                <DashboardSidebar
                    mode={role}
                    employeeActionableTaskCount={employeeActionableTaskCount}
                    user={{
                        name: user.name,
                        email: user.email,
                        accountType: user.accountType,
                        roleSlugs: user.roleSlugs,
                    }}
                />

                <SidebarInset className="min-w-0">
                    <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-2 border-b-2 border-border bg-background/95 px-4 backdrop-blur-sm">
                        <div className="flex min-w-0 items-center gap-3">
                            <SidebarTrigger />

                            <div className="hidden lg:block">
                                <p className="text-sm font-medium">{title}</p>
                            </div>
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                            <Badge
                                variant="neutral"
                                className="h-9 border-2 px-4 text-sm font-medium tabular-nums"
                            >
                                {dateTimeLabel}
                            </Badge>

                            {/*
                                   <Button
                                variant="neutral"
                                size="sm"
                                onClick={handleExport}
                                className="h-9 gap-2"
                            >
                                <FilePenLine className="h-4 w-4" />
                                Export
                            </Button>

                            <Button
                                size="sm"
                                onClick={handlePrimaryAction}
                                className="h-9 gap-1 font-semibold border-gray-700"
                            >
                                {role === "admin" ? (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Report
                                    </>
                                ) : (
                                    "Submit Daily Report"
                                )}
                            </Button>
                            
                            */}

                        </div>
                    </header>

                    <main className="relative z-0 min-h-[calc(100vh-3.5rem)] min-w-0 overflow-x-hidden overflow-y-auto p-4 md:p-6">
                        <PageTransition>{children}</PageTransition>
                    </main>
                </SidebarInset>

                <ForcedPasswordChangeDialog
                    mustChangePassword={user.mustChangePassword === true}
                />
            </SidebarProvider>
        </TooltipProvider>
    )
}
