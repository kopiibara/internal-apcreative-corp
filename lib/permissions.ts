import "server-only"

import { redirect } from "next/navigation"

import {
  getCurrentProfileContext,
  isAdminAccountType,
  type AccountType,
  type ProfileStatus,
} from "@/lib/auth-session"
import { query } from "@/lib/db"

type PermissionProfileRow = {
  id: number
  auth_user_id: string
  account_type: AccountType
  status: ProfileStatus
}

type PermissionRow = {
  id: number
}

type PermissionCheckRow = {
  has_deny: boolean
  has_allow: boolean
  has_role_permission: boolean
}

export async function can(
  authUserId: string,
  permissionKey: string,
  brandId?: number
) {
  const profileResult = await query<PermissionProfileRow>(
    `
    SELECT id, auth_user_id, account_type, status
    FROM profile
    WHERE auth_user_id = $1
    LIMIT 1
    `,
    [authUserId]
  )
  const profile = profileResult.rows[0]

  if (!profile || profile.status !== "ACTIVE") {
    return false
  }

  if (isAdminAccountType(profile.account_type)) {
    return true
  }

  const permissionResult = await query<PermissionRow>(
    `
    SELECT id
    FROM permission
    WHERE key = $1
    LIMIT 1
    `,
    [permissionKey]
  )
  const permission = permissionResult.rows[0]

  if (!permission) {
    return false
  }

  const checkResult = await query<PermissionCheckRow>(
    `
    SELECT
      EXISTS (
        SELECT 1
        FROM user_permission_override upo
        WHERE upo.profile_id = $1
          AND upo.permission_id = $2
          AND upo.effect = 'DENY'
          AND (upo.expires_at IS NULL OR upo.expires_at > now())
          AND ($3::integer IS NULL OR upo.brand_id = $3 OR upo.brand_id IS NULL)
      ) AS has_deny,
      EXISTS (
        SELECT 1
        FROM user_permission_override upo
        WHERE upo.profile_id = $1
          AND upo.permission_id = $2
          AND upo.effect = 'ALLOW'
          AND (upo.expires_at IS NULL OR upo.expires_at > now())
          AND ($3::integer IS NULL OR upo.brand_id = $3 OR upo.brand_id IS NULL)
      ) AS has_allow,
      EXISTS (
        SELECT 1
        FROM user_brand_access uba
        JOIN role_permission rp ON rp.role_id = uba.role_id
        WHERE uba.profile_id = $1
          AND uba.is_active = true
          AND rp.permission_id = $2
          AND ($3::integer IS NULL OR uba.brand_id = $3)
      ) AS has_role_permission
    `,
    [profile.id, permission.id, brandId ?? null]
  )
  const check = checkResult.rows[0]

  if (check?.has_deny) {
    return false
  }

  return Boolean(check?.has_allow || check?.has_role_permission)
}

export async function requirePermission(permissionKey: string) {
  const context = await getCurrentProfileContext()

  if (!context) {
    redirect("/login")
  }

  if (context.profile.status !== "ACTIVE") {
    redirect("/login")
  }

  const allowed = await can(context.profile.auth_user_id, permissionKey)

  if (!allowed) {
    redirect("/admin/dashboard")
  }

  return context
}
