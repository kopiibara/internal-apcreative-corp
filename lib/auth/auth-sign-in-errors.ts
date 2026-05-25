type AuthClientError = {
  message?: string | null
  status?: number | null
  code?: string | null
}

export function getSignInErrorMessage(error: AuthClientError | null | undefined) {
  if (!error) {
    return "Invalid email or password."
  }

  if (error.status === 429) {
    return "Too many attempts. Please wait and try again."
  }

  if (error.message?.trim()) {
    return error.message
  }

  return "Invalid email or password."
}
