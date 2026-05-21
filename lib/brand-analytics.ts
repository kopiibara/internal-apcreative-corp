import "server-only"

import type {
  ContentType,
  Platform,
} from "@/app/employee/approvals/schema"
import { query } from "@/lib/db"
import type { ApprovalStatus, PublishStatus } from "@/lib/approval-statuses"

export type BrandApprovalMetrics = {
  brandId: number
  totalRequests: number
  pending: number
  revisions: number
  rejected: number
  approved: number
  scheduled: number
  published: number
}

export type RecentBrandApproval = {
  id: number
  brandId: number | null
  dateSubmitted: string
  submittedByName: string
  contentType: ContentType
  platform: Platform
  caption: string
  assetLink: string | null
  supervisorStatus: ApprovalStatus
  directorStatus: ApprovalStatus
  publishStatus: PublishStatus
}

type BrandApprovalMetricsRow = {
  brand_id: number
  total_requests: number
  pending: number
  revisions: number
  rejected: number
  approved: number
  scheduled: number
  published: number
}

type RecentBrandApprovalRow = {
  id: number
  brand_id: number | null
  date_submitted: Date
  submitted_by_name: string
  content_type: ContentType
  platform: Platform
  caption: string
  asset_link: string | null
  supervisor_status: ApprovalStatus
  director_status: ApprovalStatus
  publish_status: PublishStatus
}

function toCount(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function mapMetrics(row: BrandApprovalMetricsRow): BrandApprovalMetrics {
  return {
    brandId: row.brand_id,
    totalRequests: toCount(row.total_requests),
    pending: toCount(row.pending),
    revisions: toCount(row.revisions),
    rejected: toCount(row.rejected),
    approved: toCount(row.approved),
    scheduled: toCount(row.scheduled),
    published: toCount(row.published),
  }
}

function mapRecentApproval(row: RecentBrandApprovalRow): RecentBrandApproval {
  return {
    id: row.id,
    brandId: row.brand_id,
    dateSubmitted: row.date_submitted.toISOString(),
    submittedByName: row.submitted_by_name,
    contentType: row.content_type,
    platform: row.platform,
    caption: row.caption,
    assetLink: row.asset_link,
    supervisorStatus: row.supervisor_status,
    directorStatus: row.director_status,
    publishStatus: row.publish_status,
  }
}

export async function getBrandApprovalMetrics() {
  const result = await query<BrandApprovalMetricsRow>(
    `
    SELECT
      b.id AS brand_id,
      COUNT(cr.id)::int AS total_requests,
      COUNT(cr.id) FILTER (
        WHERE
          cr.supervisor_status NOT IN ('Rejected', 'Revision')
          AND cr.director_status NOT IN ('Rejected', 'Revision')
          AND cr.publish_status NOT IN ('Scheduled', 'Published', 'Cancelled')
          AND (
            cr.supervisor_status = 'Pending'
            OR cr.director_status = 'Pending'
          )
      )::int AS pending,
      COUNT(cr.id) FILTER (
        WHERE
          cr.supervisor_status = 'Revision'
          OR cr.director_status = 'Revision'
      )::int AS revisions,
      COUNT(cr.id) FILTER (
        WHERE
          cr.supervisor_status = 'Rejected'
          OR cr.director_status = 'Rejected'
          OR cr.publish_status = 'Cancelled'
      )::int AS rejected,
      COUNT(cr.id) FILTER (
        WHERE
          cr.supervisor_status = 'Approved'
          AND cr.director_status = 'Approved'
      )::int AS approved,
      COUNT(cr.id) FILTER (WHERE cr.publish_status = 'Scheduled')::int AS scheduled,
      COUNT(cr.id) FILTER (WHERE cr.publish_status = 'Published')::int AS published
    FROM brand b
    LEFT JOIN content_report cr ON cr.brand_id = b.id
    GROUP BY b.id
    ORDER BY b.name ASC, b.id ASC
    `
  )

  return result.rows.map(mapMetrics)
}

export async function getRecentBrandApprovals(limitPerBrand = 5) {
  const result = await query<RecentBrandApprovalRow>(
    `
    SELECT
      id,
      brand_id,
      date_submitted,
      submitted_by_name,
      content_type,
      platform,
      caption,
      asset_link,
      supervisor_status,
      director_status,
      publish_status
    FROM (
      SELECT
        cr.id,
        cr.brand_id,
        cr.date_submitted,
        submitter.full_name AS submitted_by_name,
        cr.content_type,
        cr.platform,
        cr.caption,
        cr.asset_link,
        cr.supervisor_status,
        cr.director_status,
        cr.publish_status,
        ROW_NUMBER() OVER (
          PARTITION BY cr.brand_id
          ORDER BY cr.date_submitted DESC, cr.id DESC
        ) AS row_number
      FROM content_report cr
      JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
      WHERE cr.brand_id IS NOT NULL
    ) recent
    WHERE row_number <= $1
    ORDER BY date_submitted DESC, id DESC
    `,
    [limitPerBrand]
  )

  return result.rows.map(mapRecentApproval)
}
