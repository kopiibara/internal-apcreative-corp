"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth/auth-client"
import { useTheme } from "@/components/ui/theme-provider"
import { UserAvatar } from "@/components/shared/user-avatar"

import {
    ChevronDown,
    ChevronsUpDown,
    LogOut,
    Moon,
    Trophy,
    Settings,
    Sun,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    adminGroups,
    employeeGroups,
    type SidebarMode,
} from "@/types/sidebar"

type SidebarUser = {
    profileId: number
    name: string
    email: string
    accountType?: string
    roleSlugs?: string[]
    canAccessAdsCampaigns?: boolean
    canAccessTaskBoard?: boolean
    canAccessReminders?: boolean
    canAccessDailyProgress?: boolean
    canAccessPlatformAnalytics?: boolean
    canAccessPR?: boolean
    imageUrl?: string | null
    performanceSummary?: SidebarPerformanceSummary | null
}

type DashboardSidebarProps = {
    mode: SidebarMode
    user?: SidebarUser | null
    employeeActionableTaskCount?: number
}

type SidebarPerformanceSummary = {
    rank: number
    totalPoints: number
    taskPoints: number
    grossTaskPoints: number
    lateTaskDeductionPoints: number
    dailyProgressNetPoints: number
    dailyProgressPoints: number
    dailyProgressDeductions: number
}

function formatSidebarBadge(count: number) {
    if (count <= 0) {
        return undefined
    }

    return count > 99 ? "99+" : String(count)
}

const sidebarNavActiveClass =
    "border-2 border-border bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-[var(--shadow-hard-sm)] hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-all duration-200 "

const sidebarNavHoverClass =
    "border-2 border-transparent hover:border-border hover:bg-sidebar-accent  transition-all duration-200 hover:translate-x-1"

function SidebarNavCountBadge({
    count,
    onPrimaryBackground = false,
    className,
}: {
    count: string | number
    onPrimaryBackground?: boolean
    className?: string
}) {
    return (
        <Badge
            variant="status"
            className={cn(
                "ml-auto min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums shadow-none",
                onPrimaryBackground
                    ? "border-white/40 bg-destructive text-destructive-foreground"
                    : "border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700",
                className,
            )}
        >
            {count}
        </Badge>
    )
}

function SidebarPointsSummary({
    summary,
    expanded,
    onExpandedChange,
}: {
    summary: SidebarPerformanceSummary
    expanded: boolean
    onExpandedChange: (expanded: boolean) => void
}) {
    return (
        <div className="mb-3 overflow-hidden rounded-lg border-2 border-border bg-background shadow-shadow-hard-sm transition-all duration-300 ease-out">
            <button
                type="button"
                className="flex w-full cursor-pointer items-start justify-between gap-3 p-3 text-left"
                aria-expanded={expanded}
                onClick={() => onExpandedChange(!expanded)}
            >
                <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Leaderboard
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <Trophy className="size-4 shrink-0 text-blue" />
                        <span className="text-md font-black tabular-nums">
                            #{summary.rank}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Total
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <p className="text-md font-black tabular-nums">
                            {summary.totalPoints}
                        </p>
                        <ChevronDown
                            className={cn(
                                "size-4 shrink-0 transition-transform duration-300",
                                expanded && "rotate-180"
                            )}
                        />
                    </div>
                </div>
            </button>

            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <div className="space-y-2 px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md border-2 border-border bg-muted/20 p-2">
                                <p className="font-bold tabular-nums">
                                    {summary.taskPoints} pts
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Task points
                                </p>
                            </div>
                            <div className="rounded-md border-2 border-border bg-muted/20 p-2">
                                <p className="font-bold tabular-nums">
                                    {summary.dailyProgressNetPoints} pts
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Daily points
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <Badge
                                variant="destructive"
                                className="px-1.5 py-0 tabular-nums"
                            >
                                Late -{summary.lateTaskDeductionPoints}
                            </Badge>
                            <Badge
                                variant="destructive"
                                className="px-1.5 py-0 tabular-nums"
                            >
                                Daily -{summary.dailyProgressDeductions}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SidebarPointsCollapsed({
    summary,
}: {
    summary: SidebarPerformanceSummary
}) {
    return (
        <div
            className="mb-3 flex flex-col items-center gap-1 rounded-lg border-2 border-border bg-background px-1.5 py-2 text-center shadow-[var(--shadow-hard-sm)] transition-all duration-300 ease-out text-sm"
            title={`Rank #${summary.rank} · ${summary.totalPoints} total points`}
        >
            <Trophy className="size-4 text-blue" />
            <span className="text-[11px] font-black leading-none tabular-nums">
                #{summary.rank}
            </span>
            <span className="text-[10px] font-bold leading-none tabular-nums text-muted-foreground">
                {summary.totalPoints}
            </span>
        </div>
    )
}

export function DashboardSidebar({
    mode,
    user,
    employeeActionableTaskCount = 0,
}: DashboardSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { state, isMobile } = useSidebar()
    const { resolvedTheme, setTheme } = useTheme()

    const [mounted, setMounted] = useState(false)
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})
    const [isPointsExpanded, setIsPointsExpanded] = useState(true)

    const isCollapsed = !isMobile && state === "collapsed"
    const canSeeAccountControl =
        mode === "admin" &&
        (user?.accountType === "DIRECTOR" ||
            user?.accountType === "SUPERVISOR" ||
            user?.roleSlugs?.includes("director") ||
            user?.roleSlugs?.includes("marketing-director") ||
            user?.roleSlugs?.includes("supervisor"))
    const taskBadge = formatSidebarBadge(employeeActionableTaskCount)
    const canSeeAdsCampaigns = user?.canAccessAdsCampaigns === true
    const canSeePlatformAnalytics = user?.canAccessPlatformAnalytics === true
    const canSeeTaskBoard = user?.canAccessTaskBoard === true
    const canSeeReminders = user?.canAccessReminders !== false
    const canSeeDailyProgress =
        mode === "admin"
            ? user?.canAccessDailyProgress !== false
            : user?.canAccessDailyProgress === true
    const canSeePR = user?.canAccessPR === true
    const isFullStackDeveloper = user?.accountType === "FULL_STACK_DEVELOPER"
    const groups =
        mode === "admin"
            ? adminGroups
                .map((group) => ({
                    ...group,
                    items: group.items
                        .filter(
                            (item) =>
                                (item.href !== "/admin/account-control" ||
                                    canSeeAccountControl) &&
                                (item.href !== "/admin/daily-progress" ||
                                    canSeeDailyProgress) &&
                                (item.href !== "/admin/pr" || canSeePR)
                        )
                        .map((item) => {
                            if (item.title !== "To-Do") {
                                return item
                            }

                            const subItems = item.subItems?.map((subItem) =>
                                isFullStackDeveloper &&
                                    subItem.href === "/admin/to-do/tasks"
                                    ? { ...subItem, badge: taskBadge }
                                    : subItem
                            )

                            return isFullStackDeveloper
                                ? { ...item, badge: taskBadge, subItems }
                                : { ...item, subItems }
                        }),
                }))
                .filter((group) => group.items.length > 0)
            : employeeGroups
                .map((group) => ({
                    ...group,
                    items: group.items
                        .filter(
                            (item) =>
                                item.href !== "/employee/ads-campaigns" ||
                                canSeeAdsCampaigns
                        )
                        .filter(
                            (item) =>
                                item.href !== "/employee/platform-analytics" ||
                                canSeePlatformAnalytics
                        )
                        .filter(
                            (item) =>
                                item.href !== "/employee/to-do/tasks" ||
                                canSeeTaskBoard
                        )
                        .filter(
                            (item) =>
                                item.href !== "/employee/to-do/reminders" ||
                                canSeeReminders
                        )
                        .filter(
                            (item) =>
                                item.href !== "/employee/daily-progress" ||
                                canSeeDailyProgress
                        )
                        .filter(
                            (item) =>
                                item.href !== "/employee/pr" || canSeePR
                        )
                        .map((item) => {
                            if (item.title !== "To-Do") {
                                return item
                            }

                            const subItems = item.subItems
                                ?.filter((subItem) => {
                                    if (
                                        subItem.href ===
                                        "/employee/to-do/tasks" &&
                                        !canSeeTaskBoard
                                    ) {
                                        return false
                                    }

                                    if (
                                        subItem.href ===
                                        "/employee/to-do/reminders" &&
                                        !canSeeReminders
                                    ) {
                                        return false
                                    }

                                    return true
                                })
                                .map((subItem) =>
                                    subItem.href === "/employee/to-do/tasks"
                                        ? { ...subItem, badge: taskBadge }
                                        : subItem
                                )

                            return {
                                ...item,
                                badge: canSeeTaskBoard ? taskBadge : undefined,
                                subItems,
                            }
                        })
                        .filter(
                            (item) =>
                                item.title !== "To-Do" ||
                                (item.subItems?.length ?? 0) > 0
                        ),
                }))
                .filter((group) => group.items.length > 0)

    const displayUser = user ?? {
        profileId: 0,
        name: mode === "admin" ? "Executive Manager" : "Brand Officer",
        email:
            mode === "admin"
                ? "admin@apcreative.com"
                : "employee@apcreative.com",
    }

    useEffect(() => {
        const frame = requestAnimationFrame(() => setMounted(true))

        return () => cancelAnimationFrame(frame)
    }, [])

    function isRouteActive(href: string) {
        const cleanPathname = pathname.replace(/\/$/, "")
        const cleanHref = href.replace(/\/$/, "")

        if (cleanHref === "/admin" || cleanHref === "/employee") {
            return cleanPathname === cleanHref
        }

        return (
            cleanPathname === cleanHref ||
            cleanPathname.startsWith(`${cleanHref}/`)
        )
    }

    function handleToggleTheme() {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    const isDarkMode = mounted && resolvedTheme === "dark"

    async function handleLogout() {
        try {
            await authClient.signOut()

            router.push("/login")
            router.refresh()
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return (
        <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r-2 border-sidebar-border shadow-hard-sm"
        >
            <SidebarHeader
                className={
                    isCollapsed
                        ? "flex items-center justify-center px-2 py-4"
                        : "px-6 py-4"
                }
            >
                {isCollapsed ? (
                    <div >
                        <Image src="/icons/icon-no-bg.png" alt="AP Creative" width={32} height={32} />
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Image src="/icons/icon-circle.png" alt="AP Creative" width={48} height={48} />
                        <div className="flex flex-col">
                            <span className="bg-linear-to-r font-bold from-[#14327d] via-[#209cbb] to-[#a72a6f] bg-clip-text text-transparent">
                                AP Creative
                            </span>
                            <span className="bg-linear-to-r font-bold from-[#14327d] via-[#209cbb] to-[#a72a6f] bg-clip-text text-transparent">
                                Dashboard
                            </span>
                        </div>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent className={isCollapsed ? "px-2" : "px-4 py-1"}>
                {groups.map((group) => (
                    <SidebarGroup key={group.label}>
                        {!isCollapsed ? (
                            <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-[0.2em]">
                                {group.label}
                            </SidebarGroupLabel>
                        ) : null}

                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    if (item.subItems?.length) {
                                        const isSubmenuOpen =
                                            openSubmenus[item.title] ??
                                            item.subItems.some((subItem) =>
                                                isRouteActive(subItem.href)
                                            )
                                        const isActive = item.subItems.some(
                                            (subItem) =>
                                                isRouteActive(subItem.href)
                                        )
                                        if (isCollapsed) {
                                            return (
                                                <SidebarMenuItem key={item.title}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <SidebarMenuButton
                                                                type="button"
                                                                tooltip={item.title}
                                                                isActive={isActive}
                                                                className={cn(
                                                                    "mx-auto h-8 w-8 justify-center rounded-xl px-0",
                                                                    sidebarNavHoverClass,
                                                                    isActive &&
                                                                    sidebarNavActiveClass
                                                                )}
                                                            >
                                                                <item.icon className="h-3 w-3 shrink-0" />
                                                            </SidebarMenuButton>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            side="right"
                                                            align="start"
                                                            sideOffset={8}
                                                        >
                                                            {item.subItems.map((subItem) => {
                                                                const isSubActive =
                                                                    isRouteActive(subItem.href)

                                                                return (
                                                                    <DropdownMenuItem
                                                                        key={subItem.href}
                                                                        asChild
                                                                    >
                                                                        <Link
                                                                            href={subItem.href}
                                                                            aria-current={
                                                                                isSubActive
                                                                                    ? "page"
                                                                                    : undefined
                                                                            }
                                                                            className="flex w-full items-center gap-2 p-1"
                                                                        >
                                                                            <span>{subItem.title}</span>
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                )
                                                            })}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </SidebarMenuItem>
                                            )
                                        }

                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    type="button"
                                                    tooltip={item.title}
                                                    isActive={isActive}
                                                    onClick={() =>
                                                        setOpenSubmenus(
                                                            (current) => ({
                                                                ...current,
                                                                [item.title]:
                                                                    !isSubmenuOpen,
                                                            })
                                                        )
                                                    }
                                                    className={cn(
                                                        isCollapsed
                                                            ? "mx-auto h-8 w-8 justify-center rounded-xl px-0"
                                                            : "h-10 rounded-xl px-3",
                                                        sidebarNavHoverClass,
                                                        isActive &&
                                                        sidebarNavActiveClass
                                                    )}
                                                >
                                                    <item.icon className="h-3 w-3 shrink-0" />

                                                    {!isCollapsed ? (
                                                        <>
                                                            <span>{item.title}</span>
                                                            {item.badge ? (
                                                                <SidebarNavCountBadge
                                                                    count={item.badge}
                                                                    onPrimaryBackground={isActive}
                                                                />
                                                            ) : null}
                                                            <ChevronDown
                                                                className={cn(
                                                                    "h-4 w-4 shrink-0 transition-transform",
                                                                    !item.badge && "ml-auto",
                                                                    isSubmenuOpen &&
                                                                    "rotate-180"
                                                                )}
                                                            />
                                                        </>
                                                    ) : null}
                                                </SidebarMenuButton>

                                                {!isCollapsed && isSubmenuOpen ? (
                                                    <SidebarMenuSub>
                                                        {item.subItems.map(
                                                            (subItem) => {
                                                                const isSubActive =
                                                                    isRouteActive(
                                                                        subItem.href
                                                                    )

                                                                return (
                                                                    <SidebarMenuSubItem
                                                                        key={
                                                                            subItem.href
                                                                        }
                                                                    >
                                                                        <SidebarMenuSubButton
                                                                            asChild
                                                                            isActive={
                                                                                isSubActive
                                                                            }
                                                                            className={cn(
                                                                                sidebarNavHoverClass,
                                                                                isSubActive &&
                                                                                sidebarNavActiveClass
                                                                            )}
                                                                        >
                                                                            <Link
                                                                                href={
                                                                                    subItem.href
                                                                                }
                                                                                aria-current={
                                                                                    isSubActive
                                                                                        ? "page"
                                                                                        : undefined
                                                                                }
                                                                            >
                                                                                <span>
                                                                                    {
                                                                                        subItem.title
                                                                                    }
                                                                                </span>
                                                                                {subItem.badge ? (
                                                                                    <SidebarNavCountBadge
                                                                                        count={subItem.badge}
                                                                                    />
                                                                                ) : null}
                                                                            </Link>
                                                                        </SidebarMenuSubButton>
                                                                    </SidebarMenuSubItem>
                                                                )
                                                            }
                                                        )}
                                                    </SidebarMenuSub>
                                                ) : null}
                                            </SidebarMenuItem>
                                        )
                                    }

                                    if (!item.href) {
                                        return null
                                    }

                                    const isActive = isRouteActive(item.href)

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                isActive={isActive}
                                                className={cn(
                                                    isCollapsed
                                                        ? "mx-auto h-8 w-8 justify-center rounded-xl px-0"
                                                        : "h-10 rounded-xl px-3",
                                                    sidebarNavHoverClass,
                                                    isActive &&
                                                    sidebarNavActiveClass
                                                )}
                                            >
                                                <Link
                                                    href={item.href}
                                                    aria-current={
                                                        isActive
                                                            ? "page"
                                                            : undefined
                                                    }
                                                >
                                                    <item.icon className="h-3 w-3 shrink-0" />
                                                    {!isCollapsed ? (
                                                        <>
                                                            <span>{item.title}</span>
                                                            {item.badge ? (
                                                                <Badge
                                                                    variant="default"
                                                                    className="ml-auto rounded-full"
                                                                >
                                                                    {item.badge}
                                                                </Badge>
                                                            ) : null}
                                                        </>
                                                    ) : null}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className={isCollapsed ? "px-2 py-4" : "p-3"}>
                {user?.performanceSummary ? (
                    isCollapsed ? (
                        <SidebarPointsCollapsed summary={user.performanceSummary} />
                    ) : (
                        <SidebarPointsSummary
                            summary={user.performanceSummary}
                            expanded={isPointsExpanded}
                            onExpandedChange={setIsPointsExpanded}
                        />
                    )
                ) : null}
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className={
                                        isCollapsed
                                            ? "mx-auto h-10 w-10 justify-center rounded-xl px-0"
                                            : "h-12 rounded-xl"
                                    }
                                >
                                    <UserAvatar
                                        profileId={displayUser.profileId}
                                        name={displayUser.name}
                                        email={displayUser.email}
                                        imageUrl={displayUser.imageUrl}
                                        size="sm"
                                    />

                                    {!isCollapsed ? (
                                        <>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">
                                                    {displayUser.name}
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {displayUser.email}
                                                </span>
                                            </div>

                                            <ChevronsUpDown className="ml-auto h-4 w-4" />
                                        </>
                                    ) : null}
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-2 border-black bg-background p-1 shadow-none"
                                side={isMobile ? "top" : "right"}
                                align="end"
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-start gap-3 rounded-lg p-2 text-left">
                                        <UserAvatar
                                            profileId={displayUser.profileId}
                                            name={displayUser.name}
                                            email={displayUser.email}
                                            imageUrl={displayUser.imageUrl}
                                            size="md"
                                        />

                                        <div className="grid min-w-0 flex-1 gap-1 text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {displayUser.name}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {displayUser.email}
                                            </span>

                                        </div>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/account"
                                        className="flex cursor-pointer flex-row items-center gap-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Account settings
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={handleToggleTheme}
                                    className="flex cursor-pointer flex-row items-center gap-2"
                                >
                                    {isDarkMode ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Moon className="h-4 w-4" />
                                    )}
                                    {mounted
                                        ? isDarkMode
                                            ? "Switch to light mode"
                                            : "Switch to dark mode"
                                        : "Switch theme"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="flex cursor-pointer flex-row items-center gap-2 "
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
