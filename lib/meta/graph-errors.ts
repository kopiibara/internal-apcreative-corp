import "server-only"

export type MetaGraphErrorInfo = {
  message: string
  permissionDenied: boolean
  tokenExpired: boolean
  tokenInvalid: boolean
  applicationDeleted: boolean
  code: number | null
}

export function classifyMetaGraphError(error: unknown): MetaGraphErrorInfo {
  const message =
    error instanceof Error ? error.message : "Meta Graph API request failed"

  const lower = message.toLowerCase()
  const permissionDenied =
    lower.includes("permission") ||
    lower.includes("(#10)") ||
    lower.includes("error code 10") ||
    lower.includes("pages_read_engagement") ||
    lower.includes("(#200)") ||
    lower.includes("does not have permission") ||
    lower.includes("requires") ||
    lower.includes("pages_read_engagement") ||
    lower.includes("pages_read_user_content") ||
    lower.includes("read_insights")

  const tokenExpired =
    lower.includes("(#190)") ||
    lower.includes("expired") ||
    lower.includes("session has expired") ||
    lower.includes("session is invalid") ||
    lower.includes("user logged out") ||
    lower.includes("error validating access token")

  const applicationDeleted =
    lower.includes("application has been deleted") ||
    lower.includes("app has been deleted") ||
    lower.includes("error validating application")

  const tokenInvalid =
    !tokenExpired &&
    !applicationDeleted &&
    (lower.includes("invalid oauth") ||
      lower.includes("malformed access token") ||
      lower.includes("cannot parse access token"))

  const codeMatch = message.match(/\(#(\d+)\)/)
  const code = codeMatch ? Number(codeMatch[1]) : null

  return {
    message,
    permissionDenied,
    tokenExpired,
    tokenInvalid,
    applicationDeleted,
    code,
  }
}

export function isMetaPermissionError(error: unknown) {
  return classifyMetaGraphError(error).permissionDenied
}
