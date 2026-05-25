import "server-only"

export function getDefaultAccountPassword() {
  const password =
    process.env.DEFAULT_ACCOUNT_PASSWORD ??
    process.env.DEFAULT_TEMPORARY_PASSWORD

  if (!password) {
    throw new Error("DEFAULT_ACCOUNT_PASSWORD is not configured")
  }

  return password
}

/** @deprecated Prefer {@link getDefaultAccountPassword}. Kept for existing call sites. */
export function getDefaultTemporaryPassword() {
  return getDefaultAccountPassword()
}
