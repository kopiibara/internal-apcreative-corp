import { ADMIN_ROLE_SLUGS } from "@/lib/auth/account-defaults";

export const accountTypes = [
  "CLIENT",
  "EMPLOYEE",
  "PR",
  "SUPERVISOR",
  "MANAGER",
  "EXECUTIVE",
  "FULL_STACK_DEVELOPER",
  "DIRECTOR",
] as const;

export type AccountType = (typeof accountTypes)[number];

const employeeAccountTypes: AccountType[] = ["CLIENT", "EMPLOYEE", "PR"];

/** Admin-side account types that use the admin dashboard and permission bypass. */
export const ADMIN_ACCOUNT_TYPES = [
  "DIRECTOR",
  "SUPERVISOR",
  "MANAGER",
  "EXECUTIVE",
  "FULL_STACK_DEVELOPER",
] as const satisfies readonly AccountType[];

export type AdminAccountType = (typeof ADMIN_ACCOUNT_TYPES)[number];

const adminAccountTypes: AccountType[] = [...ADMIN_ACCOUNT_TYPES];

/** Admin-tier accounts share organization-wide brand access (All Brand semantics). */
export const ORGANIZATION_WIDE_BRAND_ACCOUNT_TYPES = [
  "SUPERVISOR",
  "MANAGER",
  "EXECUTIVE",
  "DIRECTOR",
  "FULL_STACK_DEVELOPER",
] as const satisfies readonly AccountType[];

export const DAILY_PROGRESS_REQUIRED_ACCOUNT_TYPES = [
  "CLIENT",
  "EMPLOYEE",
  "PR",
  "FULL_STACK_DEVELOPER",
] as const satisfies readonly AccountType[];

export const SIDEBAR_LEADERBOARD_HIDDEN_ACCOUNT_TYPES = [
  "DIRECTOR",
  "EXECUTIVE",
  "MANAGER",
  "SUPERVISOR",
] as const satisfies readonly AccountType[];

export function isDailyProgressRequiredAccountType(accountType: AccountType) {
  return (
    DAILY_PROGRESS_REQUIRED_ACCOUNT_TYPES as readonly AccountType[]
  ).includes(accountType);
}

export function shouldHideSidebarLeaderboard(accountType: AccountType) {
  return (
    SIDEBAR_LEADERBOARD_HIDDEN_ACCOUNT_TYPES as readonly AccountType[]
  ).includes(accountType);
}

export function hasOrganizationWideBrandAccess(accountType: AccountType) {
  return (
    ORGANIZATION_WIDE_BRAND_ACCOUNT_TYPES as readonly AccountType[]
  ).includes(accountType);
}

type RoleRecord = {
  slug: string;
  name: string;
};

const accountTypePriority: {
  match: (slugs: string[]) => boolean;
  accountType: AccountType;
}[] = [
  {
    match: (slugs) => slugs.includes("full-stack-developer"),
    accountType: "FULL_STACK_DEVELOPER",
  },
  {
    match: (slugs) =>
      slugs.includes("director") || slugs.includes("marketing-director"),
    accountType: "DIRECTOR",
  },
  {
    match: (slugs) => slugs.includes("executive"),
    accountType: "EXECUTIVE",
  },
  {
    match: (slugs) => slugs.includes("manager"),
    accountType: "MANAGER",
  },
  {
    match: (slugs) => slugs.includes("supervisor"),
    accountType: "SUPERVISOR",
  },
  {
    match: (slugs) => slugs.includes("pr"),
    accountType: "PR",
  },
  {
    match: (slugs) => slugs.includes("client-viewer"),
    accountType: "CLIENT",
  },
];

export function deriveAccountTypeFromRoleSlugs(
  roleSlugs: string[],
): AccountType {
  const normalizedSlugs = roleSlugs.map((slug) => slug.trim().toLowerCase());

  for (const entry of accountTypePriority) {
    if (entry.match(normalizedSlugs)) {
      return entry.accountType;
    }
  }

  return "EMPLOYEE";
}

export function derivePositionFromRoles(roles: RoleRecord[]): string | null {
  if (roles.length === 0) {
    return null;
  }

  const slugs = roles.map((role) => role.slug.toLowerCase());
  const rolesBySlug = new Map(
    roles.map((role) => [role.slug.toLowerCase(), role.name] as const),
  );
  const prioritySlugs = [
    "full-stack-developer",
    "director",
    "marketing-director",
    "executive",
    "manager",
    "supervisor",
    "pr",
    "client-viewer",
  ] as const;

  for (const slug of prioritySlugs) {
    if (slugs.includes(slug)) {
      return rolesBySlug.get(slug) ?? null;
    }
  }

  return roles[0]?.name ?? null;
}

/** Active admin-side profiles bypass role-based permission SQL checks. */
export function hasAdminPermissionBypass(accountType: AccountType) {
  return (
    isAdminAccountType(accountType) && accountType !== "FULL_STACK_DEVELOPER"
  );
}

export function isAdminAccountType(accountType: AccountType) {
  return adminAccountTypes.includes(accountType);
}

export function isEmployeeAccountType(accountType: AccountType) {
  return employeeAccountTypes.includes(accountType);
}

export function isAdminRoleSlug(roleSlug: string) {
  return ADMIN_ROLE_SLUGS.includes(
    roleSlug.toLowerCase() as (typeof ADMIN_ROLE_SLUGS)[number],
  );
}

export function getSystemAccessLabel(accountType: AccountType) {
  return isAdminAccountType(accountType)
    ? "Admin Dashboard"
    : "Employee Dashboard";
}
