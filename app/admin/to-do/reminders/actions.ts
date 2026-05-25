"use server";

import { revalidatePath } from "next/cache";

import {
  reminderFormSchema,
  reminderIdSchema,
  updateReminderSchema,
  updateReminderStatusSchema,
} from "@/app/admin/to-do/reminders/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query, transaction } from "@/lib/db";
import type { ReminderStatus } from "@/lib/reminders/reminder-statuses";
import { getReminderById } from "@/lib/reminders/reminders";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";

const REMINDER_ROUTES = ["/admin/to-do/reminders", "/employee/to-do/reminders"];

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function authorizeReminderAction() {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      } satisfies ActionResult,
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      } satisfies ActionResult,
    };
  }

  return { context };
}

function revalidateReminderRoutes() {
  for (const route of REMINDER_ROUTES) {
    revalidatePath(route);
  }
}

function parseReminderDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Reminder date is invalid.");
  }

  return date.toISOString();
}

function getInitialReminderStatus(remindAt: string | null): ReminderStatus {
  return remindAt && new Date(remindAt).getTime() <= Date.now()
    ? "DUE"
    : "PENDING";
}

async function requireOwnedReminder(reminderId: number, profileId: number) {
  const reminder = await getReminderById(reminderId);

  if (!reminder) {
    return {
      error: {
        success: false,
        message: "Reminder was not found.",
      } satisfies ActionResult,
    };
  }

  if (reminder.creatorProfileId !== profileId) {
    return {
      error: {
        success: false,
        message: "You can only update your own reminders.",
      } satisfies ActionResult,
    };
  }

  return { reminder };
}

async function guardReminderMutationRateLimit(
  bucket: string,
): Promise<ActionResult | null> {
  return rejectIfRateLimited({
    bucket,
    limit: 60,
    windowMs: 60_000,
  });
}

export async function createReminder(input: unknown): Promise<ActionResult> {
  const authorization = await authorizeReminderAction();

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardReminderMutationRateLimit("reminder:create");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = reminderFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid reminder details.",
    };
  }

  try {
    const remindAt = parseReminderDate(parsed.data.remindAt);
    const status = getInitialReminderStatus(remindAt);

    await query(
      `
      INSERT INTO reminder (
        creator_profile_id,
        title,
        description,
        remind_at,
        status,
        priority
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        authorization.context.profile.id,
        parsed.data.title,
        parsed.data.description,
        remindAt,
        status,
        parsed.data.priority,
      ],
    );

    revalidateReminderRoutes();

    return { success: true, message: "Reminder created successfully." };
  } catch (error) {
    console.error("createReminder failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateReminder(input: unknown): Promise<ActionResult> {
  const authorization = await authorizeReminderAction();

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardReminderMutationRateLimit("reminder:update");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = updateReminderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid reminder update.",
    };
  }

  const ownership = await requireOwnedReminder(
    parsed.data.reminderId,
    authorization.context.profile.id,
  );

  if (ownership.error) {
    return ownership.error;
  }

  if (ownership.reminder.status === "ARCHIVED") {
    return { success: false, message: "Archived reminders cannot be edited." };
  }

  try {
    const remindAt = parseReminderDate(parsed.data.remindAt);
    const nextStatus =
      ownership.reminder.status === "DONE"
        ? "DONE"
        : getInitialReminderStatus(remindAt);

    await query(
      `
      UPDATE reminder
      SET
        title = $2,
        description = $3,
        remind_at = $4,
        status = $5,
        priority = $6,
        updated_at = now()
      WHERE id = $1
      `,
      [
        parsed.data.reminderId,
        parsed.data.title,
        parsed.data.description,
        remindAt,
        nextStatus,
        parsed.data.priority,
      ],
    );

    revalidateReminderRoutes();

    return { success: true, message: "Reminder updated successfully." };
  } catch (error) {
    console.error("updateReminder failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function markReminderDone(input: unknown): Promise<ActionResult> {
  return updateReminderStatus({ ...((input ?? {}) as object), status: "DONE" });
}

export async function archiveReminder(input: unknown): Promise<ActionResult> {
  return updateReminderStatus({
    ...((input ?? {}) as object),
    status: "ARCHIVED",
  });
}

export async function updateReminderStatus(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeReminderAction();

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardReminderMutationRateLimit("reminder:status");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = updateReminderStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid reminder status.",
    };
  }

  const ownership = await requireOwnedReminder(
    parsed.data.reminderId,
    authorization.context.profile.id,
  );

  if (ownership.error) {
    return ownership.error;
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `
        UPDATE reminder
        SET
          status = $2,
          completed_at = CASE WHEN $2 = 'DONE' THEN now() ELSE NULL END,
          archived_at = CASE WHEN $2 = 'ARCHIVED' THEN now() ELSE NULL END,
          updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.reminderId, parsed.data.status],
      );
    });

    revalidateReminderRoutes();

    return { success: true, message: "Reminder status updated." };
  } catch (error) {
    console.error("updateReminderStatus failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function deleteReminder(input: unknown): Promise<ActionResult> {
  const parsed = reminderIdSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Invalid reminder delete request." };
  }

  return archiveReminder({ reminderId: parsed.data.reminderId });
}
