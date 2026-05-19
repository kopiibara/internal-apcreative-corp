import "server-only"

export function getDefaultTemporaryPassword() {
  const password = process.env.DEFAULT_TEMPORARY_PASSWORD

  if (!password) {
    throw new Error("DEFAULT_TEMPORARY_PASSWORD is not configured")
  }

  return password
}
