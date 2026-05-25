import "server-only"

import { query } from "@/lib/db"
import type { AccountType, ProfileStatus } from "@/app/admin/account-control/schema"

export type AccountBrandAccess = {
  id: number
  brandId: number
  brandName: string
  roleId: number
  roleName: string
  isPrimary: boolean
  isActive: boolean
  grantedAt: string
  revokedAt: string | null
}

export type AccountControlLogItem = {
  id: number
  action: string
  summary: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actorName: string
  actorAccountType: AccountType
}

export type AccountListItem = {
  id: number
  authUserId: string
  fullName: string
  email: string
  accountType: AccountType
  position: string | null
  department: string | null
  phoneNumber: string | null
  status: ProfileStatus
  mustChangePassword: boolean
  passwordChangedAt: string | null
  firstLoginCompletedAt: string | null
  deletedAt: string | null
  deletedReason: string | null
  createdAt: string
  updatedAt: string
  brandAccess: AccountBrandAccess[]
  logs: AccountControlLogItem[]
}

export type BrandOption = {
  id: number
  name: string
  slug: string
}

export type RoleOption = {
  id: number
  name: string
  slug: string
  level: number
}

type AccountRow = {
  id: number
  auth_user_id: string
  full_name: string
  email: string
  account_type: AccountType
  position: string | null
  department: string | null
  phone_number: string | null
  status: ProfileStatus
  must_change_password: boolean
  password_changed_at: Date | null
  first_login_completed_at: Date | null
  deleted_at: Date | null
  deleted_reason: string | null
  created_at: Date
  updated_at: Date
  brand_access: AccountBrandAccess[] | null
  account_logs: AccountControlLogItem[] | null
}

type BrandRow = {
  id: number
  name: string
  slug: string
}

type RoleRow = {
  id: number
  name: string
  slug: string
  level: number
}

export async function getAccounts() {
  const result = await query<AccountRow>(
    `
    SELECT
      p.id,
      p.auth_user_id,
      p.full_name,
      p.email,
      p.account_type,
      p.position,
      p.department,
      p.phone_number,
      p.status,
      p.must_change_password,
      p.password_changed_at,
      p.first_login_completed_at,
      p.deleted_at,
      p.deleted_reason,
      p.created_at,
      p.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', uba.id,
            'brandId', b.id,
            'brandName', b.name,
            'roleId', r.id,
            'roleName', r.name,
            'isPrimary', uba.is_primary,
            'isActive', uba.is_active,
            'grantedAt', uba.granted_at,
            'revokedAt', uba.revoked_at
          )
          ORDER BY uba.is_active DESC, uba.is_primary DESC, b.name ASC
        ) FILTER (WHERE uba.id IS NOT NULL),
        '[]'::json
      ) AS brand_access
      ,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', acl.id,
              'action', acl.action,
              'summary', acl.summary,
              'metadata', acl.metadata,
              'createdAt', acl.created_at,
              'actorName', actor.full_name,
              'actorAccountType', actor.account_type
            )
            ORDER BY acl.created_at DESC, acl.id DESC
          )
          FROM account_control_logs acl
          JOIN profile actor ON actor.id = acl.actor_profile_id
          WHERE acl.target_profile_id = p.id
        ),
        '[]'::json
      ) AS account_logs
    FROM profile p
    LEFT JOIN user_brand_access uba ON uba.profile_id = p.id
    LEFT JOIN brand b ON b.id = uba.brand_id
    LEFT JOIN "role" r ON r.id = uba.role_id
    GROUP BY p.id
    ORDER BY p.created_at DESC, p.full_name ASC
    `
  )

  return result.rows.map((row) => ({
    id: row.id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    email: row.email,
    accountType: row.account_type,
    position: row.position,
    department: row.department,
    phoneNumber: row.phone_number,
    status: row.status,
    mustChangePassword: row.must_change_password,
    passwordChangedAt: row.password_changed_at?.toISOString() ?? null,
    firstLoginCompletedAt: row.first_login_completed_at?.toISOString() ?? null,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    deletedReason: row.deleted_reason,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    brandAccess: row.brand_access ?? [],
    logs: (row.account_logs ?? []).map((log) => ({
      ...log,
      createdAt: new Date(log.createdAt).toISOString(),
    })),
  }))
}

export async function getActiveBrands() {
  const result = await query<BrandRow>(
    `
    SELECT id, name, slug
    FROM brand
    WHERE is_active = true
    ORDER BY name ASC
    `
  )

  return result.rows
}

export async function getActiveRoles() {
  const result = await query<RoleRow>(
    `
    SELECT id, name, slug, level
    FROM "role"
    WHERE is_active = true
    ORDER BY level DESC, name ASC
    `
  )

  return result.rows
}

export async function getAccountManagementData() {
  const [accounts, brands, roles] = await Promise.all([
    getAccounts(),
    getActiveBrands(),
    getActiveRoles(),
  ])

  return {
    accounts,
    brands,
    roles,
  }
}
