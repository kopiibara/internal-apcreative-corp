import "server-only"

import { query } from "@/lib/db"
import type {
  ReminderPriority,
  ReminderStatus,
} from "@/lib/reminder-statuses"

export type ReminderRecord = {
  id: number
  creatorProfileId: number
  title: string
  description: string | null
  remindAt: string | null
  status: ReminderStatus
  priority: ReminderPriority
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

type ReminderRow = {
  id: number
  creator_profile_id: number
  title: string
  description: string | null
  remind_at: Date | null
  status: ReminderStatus
  priority: ReminderPriority
  completed_at: Date | null
  archived_at: Date | null
  created_at: Date
  updated_at: Date
}

function mapReminder(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    creatorProfileId: row.creator_profile_id,
    title: row.title,
    description: row.description,
    remindAt: row.remind_at?.toISOString() ?? null,
    status: getReminderKanbanStatus({
      status: row.status,
      remindAt: row.remind_at?.toISOString() ?? null,
    }),
    priority: row.priority,
    completedAt: row.completed_at?.toISOString() ?? null,
    archivedAt: row.archived_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export function getReminderKanbanStatus(reminder: {
  status: ReminderStatus
  remindAt: string | null
}): ReminderStatus {
  if (
    reminder.status === "PENDING" &&
    reminder.remindAt &&
    new Date(reminder.remindAt).getTime() <= Date.now()
  ) {
    return "DUE"
  }

  return reminder.status
}

export async function getRemindersForProfile(profileId: number) {
  const result = await query<ReminderRow>(
    `
    SELECT
      id,
      creator_profile_id,
      title,
      description,
      remind_at,
      status,
      priority,
      completed_at,
      archived_at,
      created_at,
      updated_at
    FROM reminder
    WHERE creator_profile_id = $1
    ORDER BY
      CASE status
        WHEN 'DUE' THEN 1
        WHEN 'PENDING' THEN 2
        WHEN 'DONE' THEN 3
        WHEN 'ARCHIVED' THEN 4
      END,
      remind_at ASC NULLS LAST,
      updated_at DESC,
      id DESC
    `,
    [profileId]
  )

  return result.rows.map(mapReminder)
}

export async function getReminderById(reminderId: number) {
  const result = await query<ReminderRow>(
    `
    SELECT
      id,
      creator_profile_id,
      title,
      description,
      remind_at,
      status,
      priority,
      completed_at,
      archived_at,
      created_at,
      updated_at
    FROM reminder
    WHERE id = $1
    LIMIT 1
    `,
    [reminderId]
  )

  const row = result.rows[0]
  return row ? mapReminder(row) : null
}
