export const WIDE_LAYOUT_ROUTES = [
  "/admin/approvals",
  "/employee/approvals",
  "/admin/to-do/tasks",
  "/employee/to-do/tasks",
  "/admin/to-do/reminders",
  "/employee/to-do/reminders",
] as const

export function isWideLayoutRoute(pathname: string) {
  const cleanPathname = pathname.replace(/\/$/, "")

  return WIDE_LAYOUT_ROUTES.some((route) => {
    const cleanRoute = route.replace(/\/$/, "")
    return (
      cleanPathname === cleanRoute ||
      cleanPathname.startsWith(`${cleanRoute}/`)
    )
  })
}
