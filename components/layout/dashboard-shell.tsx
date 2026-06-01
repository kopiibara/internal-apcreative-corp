"use client"

import { type CSSProperties, useEffect, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"

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

import { isWideLayoutRoute } from "@/lib/wide-routes"
import { adminGroups, employeeGroups, type SidebarGroupItem } from "@/types/sidebar"
import { cn } from "@/lib/utils"

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

    return () => {
        dateTimeSubscribers.delete(callback)
    }
}

function getDateTimeSnapshot() {
    return currentDateTimeLabel
}

function getServerDateTimeSnapshot() {
    return SERVER_DATE_TIME_LABEL
}

function normalizePath(path: string) {
    const cleanPath = path.split("?")[0]?.replace(/\/$/, "") ?? path

    return cleanPath || "/"
}

function getTitleFromGroups(pathname: string, groups: SidebarGroupItem[]) {
    const cleanPathname = normalizePath(pathname)
    const matches: { href: string; title: string }[] = []

    for (const group of groups) {
        for (const item of group.items) {
            if (item.href) {
                matches.push({ href: item.href, title: item.title })
            }

            for (const subItem of item.subItems ?? []) {
                matches.push({ href: subItem.href, title: subItem.title })
            }
        }
    }

    const activeMatch = matches
        .map((match) => ({ ...match, href: normalizePath(match.href) }))
        .filter((match) => {
            if (match.href === "/admin" || match.href === "/employee") {
                return cleanPathname === match.href
            }

            return (
                cleanPathname === match.href ||
                cleanPathname.startsWith(`${match.href}/`)
            )
        })
        .sort((left, right) => right.href.length - left.href.length)[0]

    return activeMatch?.title
}

type DashboardUser = {
    profileId: number
    name: string
    email: string
    accountType: string
    roleSlugs?: string[]
    canAccessAdsCampaigns?: boolean
    canAccessTaskBoard?: boolean
    canAccessReminders?: boolean
    canAccessDailyProgress?: boolean
    canAccessPlatformAnalytics?: boolean
    canAccessPR?: boolean
    imageUrl?: string | null
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
    const pathname = usePathname()
    const dateTimeLabel = useSyncExternalStore(
        subscribeToDateTime,
        getDateTimeSnapshot,
        getServerDateTimeSnapshot
    )

    useEffect(() => {
        updateDateTimeSnapshot()

        if (dateTimeIntervalId === null) {
            dateTimeIntervalId = window.setInterval(updateDateTimeSnapshot, 1000)
        }

        return () => {
            if (dateTimeIntervalId !== null) {
                window.clearInterval(dateTimeIntervalId)
                dateTimeIntervalId = null
            }
        }
    }, [])
    const headerTitle =
        getTitleFromGroups(pathname, role === "admin" ? adminGroups : employeeGroups) ??
        title
    const isWideLayout = isWideLayoutRoute(pathname)

    return (
        <TooltipProvider delayDuration={0}>
            <SidebarProvider
                defaultOpen={true}
                className="h-svh min-w-0 overflow-hidden"
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
                        profileId: user.profileId,
                        name: user.name,
                        email: user.email,
                        accountType: user.accountType,
                        roleSlugs: user.roleSlugs,
                        canAccessAdsCampaigns: user.canAccessAdsCampaigns,
                        canAccessTaskBoard: user.canAccessTaskBoard,
                        canAccessReminders: user.canAccessReminders,
                        canAccessDailyProgress: user.canAccessDailyProgress,
                        canAccessPlatformAnalytics: user.canAccessPlatformAnalytics,
                        canAccessPR: user.canAccessPR,
                        imageUrl: user.imageUrl,
                    }}
                />

                <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden">
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 min-w-0 items-center justify-between gap-2 border-b-2 border-border bg-background px-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <SidebarTrigger className="cursor-pointer" />

                            <div className="hidden lg:block">
                                <h1 className="text-lg font-bold tracking-tight">{headerTitle}</h1>
                            </div>
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                            {/* 
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="neutral"
                                        size="sm"
                                        className="h-9 gap-2 px-3"
                                    >
                                        <FileText className="size-4" />
                                        <span className="hidden sm:inline">Changelog</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    sideOffset={8}
                                    className="w-72 rounded-lg border-2 border-border p-4 shadow-[var(--shadow-hard-sm)]"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">Changelog</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Current version v{appVersion}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">v{appVersion}</Badge>
                                        </div>
                                        <Button asChild size="sm" className="w-full justify-between">
                                            <Link href="/changelog">
                                                View changelog
                                                <ExternalLink className="size-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            */}

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

                    <main
                        className={cn(
                            "relative z-0 min-h-0 flex-1 min-w-0 overflow-x-hidden p-4 md:p-6",
                            isWideLayout
                                ? "flex flex-col overflow-hidden"
                                : "overflow-y-auto"
                        )}
                    >
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(#111 1px, transparent 1px)",
                                backgroundSize: "6px 6px",
                            }}
                        />
                        <div
                            className={cn(
                                "relative z-1",
                                isWideLayout && "flex min-h-0 flex-1 flex-col"
                            )}
                        >
                            <PageTransition>{children}</PageTransition>
                        </div>
                    </main>
                </SidebarInset>

                <ForcedPasswordChangeDialog
                    mustChangePassword={user.mustChangePassword === true}
                />
            </SidebarProvider>
        </TooltipProvider >
    )
}
