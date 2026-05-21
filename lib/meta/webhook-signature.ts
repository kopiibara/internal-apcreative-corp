import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { getMetaAppSecret } from "@/lib/meta/config"

/** Validate Meta X-Hub-Signature-256 against the unmodified request body bytes. */
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null
) {
  const appSecret = getMetaAppSecret()

  if (!appSecret || !signatureHeader) {
    return false
  }

  const expectedPrefix = "sha256="
  if (!signatureHeader.startsWith(expectedPrefix)) {
    return false
  }

  const receivedHash = signatureHeader.slice(expectedPrefix.length)
  const computedHash = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")

  try {
    const receivedBuffer = Buffer.from(receivedHash, "hex")
    const computedBuffer = Buffer.from(computedHash, "hex")

    if (receivedBuffer.length !== computedBuffer.length) {
      return false
    }

    return timingSafeEqual(receivedBuffer, computedBuffer)
  } catch {
    return false
  }
}
