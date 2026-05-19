export const DEFAULT_DEPARTMENT = "Marketing"
export const CLIENT_VIEWER_DEPARTMENT = "Client"

export const ADMIN_ROLE_SLUGS = [
  "full-stack-developer",
  "manager",
  "executive",
  "supervisor",
  "director",
  "marketing-director",
] as const

export type AdminRoleSlug = (typeof ADMIN_ROLE_SLUGS)[number]
