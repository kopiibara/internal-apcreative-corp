import { headers } from "next/headers";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";

export const RATE_LIMIT_MESSAGE =
  "Too many requests. Please wait a moment and try again.";

type EnforceRateLimitInput = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type RateLimitRow = {
  request_count: number;
  expires_at: Date;
};

function getRetryAfterSeconds(expiresAt: Date) {
  return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}

async function getRateKey() {
  try {
    const context = await getCurrentProfileContext();

    if (context) {
      return `profile:${context.profile.id}`;
    }
  } catch {
    // Fall back to IP when no authenticated profile can be loaded.
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerList.get("x-real-ip")?.trim();

  return `ip:${forwardedFor || realIp || "unknown"}`;
}

export async function enforceRateLimit({
  bucket,
  limit,
  windowMs,
}: EnforceRateLimitInput) {
  const rateKey = await getRateKey();
  const windowInterval = `${Math.ceil(windowMs / 1000)} seconds`;

  try {
    await query("DELETE FROM rate_limit_bucket WHERE expires_at < now()");

    const result = await query<RateLimitRow>(
      `
      INSERT INTO rate_limit_bucket (
        rate_key,
        bucket,
        request_count,
        window_start,
        expires_at
      )
      VALUES ($1, $2, 1, now(), now() + $3::interval)
      ON CONFLICT (rate_key, bucket)
      DO UPDATE SET
        request_count = CASE
          WHEN rate_limit_bucket.expires_at <= now() THEN 1
          ELSE rate_limit_bucket.request_count + 1
        END,
        window_start = CASE
          WHEN rate_limit_bucket.expires_at <= now() THEN now()
          ELSE rate_limit_bucket.window_start
        END,
        expires_at = CASE
          WHEN rate_limit_bucket.expires_at <= now() THEN now() + $3::interval
          ELSE rate_limit_bucket.expires_at
        END,
        updated_at = now()
      RETURNING request_count, expires_at
      `,
      [rateKey, bucket, windowInterval],
    );
    const row = result.rows[0];

    if (!row || row.request_count <= limit) {
      return { success: true as const };
    }

    return {
      success: false as const,
      message: RATE_LIMIT_MESSAGE,
      retryAfter: getRetryAfterSeconds(row.expires_at),
    };
  } catch (error) {
    console.error("enforceRateLimit failed:", error);

    return {
      success: false as const,
      message: RATE_LIMIT_MESSAGE,
      retryAfter: 60,
    };
  }
}
