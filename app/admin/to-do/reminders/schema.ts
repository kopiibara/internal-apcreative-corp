import { z } from "zod"

import {
  REMINDER_PRIORITIES,
  REMINDER_STATUSES,
} from "@/lib/reminder-statuses"

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))

export const reminderFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: optionalText,
  remindAt: z.string().nullable().optional(),
  priority: z.enum(REMINDER_PRIORITIES).default("MEDIUM"),
})

export const updateReminderSchema = reminderFormSchema.extend({
  reminderId: z.coerce.number().int().positive(),
})

export const reminderIdSchema = z.object({
  reminderId: z.coerce.number().int().positive(),
})

export const updateReminderStatusSchema = z.object({
  reminderId: z.coerce.number().int().positive(),
  status: z.enum(REMINDER_STATUSES),
})

export type ReminderFormInput = z.infer<typeof reminderFormSchema>
