"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DICEBEAR_COLLECTIONS,
  createDiceBearDataUri,
} from "@/lib/avatar/dicebear";
import { getProfileAvatarSeed } from "@/lib/avatar/seed";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";

type ActionResult = {
  success: boolean;
  message: string;
};

type ProfileContext = NonNullable<
  Awaited<ReturnType<typeof getCurrentProfileContext>>
>;

type AvatarAuthorization =
  | { ok: true; context: ProfileContext }
  | { ok: false; message: string };

const diceBearAvatarSchema = z.object({
  collectionId: z.enum(DICEBEAR_COLLECTIONS.map((collection) => collection.id)),
});

const uploadedAvatarSchema = z.object({
  dataUrl: z
    .string()
    .max(1_100_000, "Avatar image must be 1 MB or smaller.")
    .refine(
      (value) =>
        /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value),
      "Upload a PNG, JPG, WebP, or GIF image.",
    ),
});

async function authorizeAvatarUpdate(): Promise<AvatarAuthorization> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      ok: false,
      message: "You must be signed in to update your avatar.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return { ok: false, message: "Your account is not active." };
  }

  const rateLimit = await rejectIfRateLimited({
    bucket: "account:avatar",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimit) {
    return { ok: false, message: rateLimit.message };
  }

  return { ok: true, context };
}

async function updateUserImage(authUserId: string, image: string | null) {
  await query(
    `
    UPDATE "user"
    SET image = $2,
        "updatedAt" = now()
    WHERE id = $1
    `,
    [authUserId, image],
  );

  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/employee");
}

export async function updateDiceBearAvatar(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeAvatarUpdate();

  if (!authorization.ok) {
    return { success: false, message: authorization.message };
  }

  const parsed = diceBearAvatarSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid avatar collection.",
    };
  }

  const { profile } = authorization.context;
  const image = createDiceBearDataUri(
    getProfileAvatarSeed(profile.id),
    parsed.data.collectionId,
  );

  await updateUserImage(profile.auth_user_id, image);

  return { success: true, message: "Avatar updated." };
}

export async function updateUploadedAvatar(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeAvatarUpdate();

  if (!authorization.ok) {
    return { success: false, message: authorization.message };
  }

  const parsed = uploadedAvatarSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid avatar upload.",
    };
  }

  await updateUserImage(
    authorization.context.profile.auth_user_id,
    parsed.data.dataUrl,
  );

  return { success: true, message: "Avatar uploaded." };
}

export async function resetAvatar(): Promise<ActionResult> {
  const authorization = await authorizeAvatarUpdate();

  if (!authorization.ok) {
    return { success: false, message: authorization.message };
  }

  await updateUserImage(authorization.context.profile.auth_user_id, null);

  return { success: true, message: "Avatar reset." };
}
