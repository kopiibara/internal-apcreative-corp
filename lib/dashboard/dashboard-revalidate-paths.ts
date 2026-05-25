/** Shared dashboard routes invalidated after approval/task mutations. */

export const ADMIN_APPROVALS_PATH = "/admin/approvals"
export const EMPLOYEE_APPROVALS_PATH = "/employee/approvals"
export const EMPLOYEE_CONTENT_REPORT_PATH = "/employee/content-report"
export const ADMIN_TASKS_PATH = "/admin/to-do/tasks"
export const EMPLOYEE_TASKS_PATH = "/employee/to-do/tasks"
export const ADMIN_DAILY_REPORTS_PATH = "/admin/daily-reports"
export const ADMIN_BRANDS_PATH = "/admin/brands"
export const STAFF_ACCOUNTABILITY_PATH = "/admin/staff-accountability"

export const APPROVAL_REVALIDATE_PATHS = [
  ADMIN_APPROVALS_PATH,
  EMPLOYEE_APPROVALS_PATH,
  EMPLOYEE_CONTENT_REPORT_PATH,
  ADMIN_DAILY_REPORTS_PATH,
  ADMIN_BRANDS_PATH,
] as const

export const TASK_REVALIDATE_PATHS = [
  ADMIN_TASKS_PATH,
  EMPLOYEE_TASKS_PATH,
  ADMIN_DAILY_REPORTS_PATH,
  STAFF_ACCOUNTABILITY_PATH,
] as const
