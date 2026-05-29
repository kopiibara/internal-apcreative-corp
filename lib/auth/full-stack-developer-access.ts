import type { AccountType } from "@/lib/auth/account-type";

/**
 * Full Stack Developer accounts use the admin dashboard to monitor product
 * updates. They must not perform supervisor-style operations (account control,
 * approval reviews, or task management).
 */
export const FULL_STACK_DEVELOPER_DENIED_PERMISSIONS = new Set([
  "accounts.view",
  "accounts.create",
  "accounts.update",
  "accounts.disable",
  "accounts.delete",
  "approvals.supervisor_review",
  "approvals.director_review",
  "approvals.publish_update",
  "approvals.request_revision",
  "approvals.approve",
  "approvals.reject",
  "tasks.create",
  "tasks.assign",
  "tasks.update",
  "tasks.delete",
  "tasks.review",
  "tasks.manage_all",
  "tasks.complete",
]);

/** Employee-route actions Full Stack Developers may still perform. */
export const FULL_STACK_DEVELOPER_EMPLOYEE_PERMISSION_ALLOWLIST = new Set([
  "tasks.view",
  "tasks.submit_proof",
  "content_reports.view",
  "content_reports.create",
  "content_reports.update",
  "content_reports.submit",
  "content_reports.delete",
  "daily_progress.submit",
  "daily_progress.view_own",
  "ads_campaigns.view",
  "ads_campaigns.import",
  "ads_campaigns.create",
  "ads_campaigns.update",
  "ads_campaigns.delete",
  "ads_campaigns.manage",
  "platform_analytics.view",
  "reminders.view",
  "reminders.create",
  "reminders.update",
  "reminders.delete",
]);

const FULL_STACK_DEVELOPER_READ_ACTIONS = new Set([
  "view",
  "view_own",
  "view_all",
]);

export function isFullStackDeveloperAccountType(
  accountType: AccountType,
): boolean {
  return accountType === "FULL_STACK_DEVELOPER";
}

export function isFullStackDeveloperAdminReadOnly(accountType: AccountType) {
  return isFullStackDeveloperAccountType(accountType);
}

export function isFullStackDeveloperDeniedPermission(permissionKey: string) {
  if (FULL_STACK_DEVELOPER_DENIED_PERMISSIONS.has(permissionKey)) {
    return true;
  }

  if (FULL_STACK_DEVELOPER_EMPLOYEE_PERMISSION_ALLOWLIST.has(permissionKey)) {
    return false;
  }

  const action = permissionKey.split(".").pop() ?? "";

  if (FULL_STACK_DEVELOPER_READ_ACTIONS.has(action)) {
    return false;
  }

  if (action === "submit" || action === "submit_proof") {
    return false;
  }

  return true;
}

export function canFullStackDeveloperUseSensitiveAccountAction(
  accountType: AccountType,
) {
  return !isFullStackDeveloperAccountType(accountType);
}
