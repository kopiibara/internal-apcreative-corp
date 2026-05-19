"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { useTheme } from "@/components/ui/theme-provider"

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    User,
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
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
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
    name: string
    email: string
    accountType?: string
    roleSlugs?: string[]
    avatarUrl?: string
}

type DashboardSidebarProps = {
    mode: SidebarMode
    user?: SidebarUser | null
}

function getInitials(name?: string) {
    if (!name) return "AP"

    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
}

export function DashboardSidebar({
    mode,
    user,
}: DashboardSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { state, isMobile } = useSidebar()
    const { resolvedTheme, setTheme } = useTheme()

    const [mounted, setMounted] = useState(false)

    const isCollapsed = state === "collapsed"
    const canSeeAccountControl =
        mode === "admin" &&
        (user?.accountType === "FULL_STACK_DEVELOPER" ||
            user?.accountType === "SUPERVISOR" ||
            user?.roleSlugs?.includes("supervisor") ||
            user?.roleSlugs?.includes("full-stack-developer"))
    const groups =
        mode === "admin"
            ? adminGroups
                .map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (item) =>
                            item.href !== "/admin/account-control" ||
                            canSeeAccountControl
                    ),
                }))
                .filter((group) => group.items.length > 0)
            : employeeGroups

    const displayUser = user ?? {
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
        <Sidebar variant="sidebar" collapsible="icon" className="border-r">
            <SidebarHeader
                className={
                    isCollapsed
                        ? "flex items-center justify-center px-2 py-4"
                        : "px-6 py-6"
                }
            >
                {isCollapsed ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold">
                        AP
                    </div>
                ) : (
                    <div>
                        <h1 className="text-xl font-bold">AP Creative</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Marketing Operations Command Center
                        </p>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent className={isCollapsed ? "px-2" : "px-4"}>
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
                                                    isActive &&
                                                    "bg-accent-foreground text-sidebar-primary-foreground font-medium rounded-md hover:bg-sidebar-primary hover:text-sidebar-primary-foreground border border-border transition-all duration-150"
                                                )}
                                            >
                                                <Link
                                                    href={item.href}
                                                    aria-current={isActive ? "page" : undefined}
                                                >
                                                    <item.icon className="h-3 w-3 shrink-0" />

                                                    {!isCollapsed ? (
                                                        <>
                                                            <span>{item.title}</span>

                                                            {item.badge ? (
                                                                <Badge
                                                                    variant="secondary"
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

            <SidebarFooter className={isCollapsed ? "px-2 py-4" : "p-4"}>
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
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage
                                            src={displayUser.avatarUrl}
                                            alt={displayUser.name}
                                        />
                                        <AvatarFallback className="rounded-lg">
                                            {getInitials(displayUser.name)}
                                        </AvatarFallback>
                                    </Avatar>

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
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side={isMobile ? "bottom" : "right"}
                                align="end"
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage
                                                src={displayUser.avatarUrl}
                                                alt={displayUser.name}
                                            />
                                            <AvatarFallback className="rounded-lg">
                                                {getInitials(displayUser.name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">
                                                {displayUser.name}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {displayUser.email}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator />

                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <User className="h-4 w-4" />
                                        Account
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={handleToggleTheme}>
                                    {mounted && resolvedTheme === "dark" ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Moon className="h-4 w-4" />
                                    )}

                                    {mounted && resolvedTheme === "dark"
                                        ? "Light mode"
                                        : "Dark mode"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={handleLogout}>
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
