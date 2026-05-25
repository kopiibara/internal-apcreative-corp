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

/** Roles that may be paired with the system All Brand workspace. */
export const ALL_BRAND_ALLOWED_ROLE_SLUGS = [
  ...ADMIN_ROLE_SLUGS,
  "multimedia",
] as const

export const ALL_BRAND_ASSIGNMENT_ERROR_MESSAGE =
  "All Brand can only be assigned with director, executive, manager, supervisor, multimedia, or full stack developer roles."

export function isAllBrandAllowedRoleSlug(slug: string) {
  return (ALL_BRAND_ALLOWED_ROLE_SLUGS as readonly string[]).includes(slug)
}
