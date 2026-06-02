"use server";

import { revalidatePath } from "next/cache";

import {
  createFormSubmissionSchema,
  formSubmissionPayloadSchemas,
} from "@/app/admin/forms/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import type { AccountType } from "@/lib/auth/account-type";
import { query } from "@/lib/db";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from "@/lib/security/sanitize-text";

const FORMS_PATH = "/admin/forms";
const ALLOWED_FORM_ACCOUNT_TYPES = new Set<AccountType>([
  "EXECUTIVE",
  "DIRECTOR",
  "MANAGER",
  "SUPERVISOR",
]);

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

function sanitizePayloadValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeOptionalText(value, 5000) ?? "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? sanitizeRequiredText(item, 120) : null,
      )
      .filter((item): item is string => Boolean(item));
  }

  return value;
}

function sanitizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      sanitizePayloadValue(value),
    ]),
  );
}

async function authorizeFormsAction(): Promise<
  { profileId: number } | { error: ActionResult }
> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      },
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      },
    };
  }

  if (!ALLOWED_FORM_ACCOUNT_TYPES.has(context.profile.account_type)) {
    return {
      error: {
        success: false,
        message: "You do not have permission to manage forms.",
      },
    };
  }

  return { profileId: context.profile.id };
}

export async function createFormSubmission(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeFormsAction();

  if ("error" in authorization) {
    return authorization.error;
  }

  const rateLimitError = await rejectIfRateLimited({
    bucket: "forms:create",
    limit: 40,
    windowMs: 60_000,
  });

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = createFormSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the form details.",
    };
  }

  const payloadSchema = formSubmissionPayloadSchemas[parsed.data.formType];
  const payload = payloadSchema.safeParse(parsed.data.payload);

  if (!payload.success) {
    return {
      success: false,
      message:
        payload.error.issues[0]?.message ?? "Please check the form details.",
    };
  }

  await query(
    `
    INSERT INTO form_submission (
      form_type,
      payload,
      created_by_profile_id
    )
    VALUES ($1, $2::jsonb, $3)
    `,
    [
      parsed.data.formType,
      JSON.stringify(sanitizePayload(payload.data)),
      authorization.profileId,
    ],
  );

  revalidatePath(FORMS_PATH);

  return {
    success: true,
    message: "Form saved successfully.",
  };
}
