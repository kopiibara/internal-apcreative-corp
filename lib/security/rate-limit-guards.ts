import "server-only";

import { enforceRateLimit } from "@/lib/rate-limit";

export type RateLimitGuardOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
};

export type RateLimitFailure = {
  success: false;
  message: string;
};

export async function rejectIfRateLimited(
  options: RateLimitGuardOptions,
): Promise<RateLimitFailure | null> {
  const rateLimit = await enforceRateLimit(options);

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  return null;
}
