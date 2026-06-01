import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function resolveEncryptionKey(): Buffer {
  const dedicated = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (dedicated) {
    const asBase64 = Buffer.from(dedicated, "base64");
    if (asBase64.length === 32) {
      return asBase64;
    }
    const asUtf8 = Buffer.from(dedicated, "utf8");
    if (asUtf8.length === 32) {
      return asUtf8;
    }
    return createHash("sha256").update(dedicated).digest();
  }

  const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error(
      "Set INTEGRATION_TOKEN_ENCRYPTION_KEY or BETTER_AUTH_SECRET for integration token encryption.",
    );
  }

  return createHash("sha256").update(authSecret).digest();
}

export function encryptIntegrationToken(plaintext: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptIntegrationToken(payload: string): string {
  const key = resolveEncryptionKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
