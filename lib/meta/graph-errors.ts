import "server-only"

export type MetaGraphErrorInfo = {
  message: string
  permissionDenied: boolean
  tokenExpired: boolean
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
    lower.includes("invalid oauth") ||
    lower.includes("invalid access token") ||
    lower.includes("session has expired")

  const codeMatch = message.match(/\(#(\d+)\)/)
  const code = codeMatch ? Number(codeMatch[1]) : null

  return {
    message,
    permissionDenied,
    tokenExpired,
    code,
  }
}

export function isMetaPermissionError(error: unknown) {
  return classifyMetaGraphError(error).permissionDenied
}
