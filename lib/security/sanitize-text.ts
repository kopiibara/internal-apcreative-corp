import "server-only";

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const DEFAULT_MAX_LENGTH = 4000;

export function sanitizeOptionalText(
  value: string | null | undefined,
  maxLength = DEFAULT_MAX_LENGTH,
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.replace(CONTROL_CHAR_PATTERN, "").trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

export function sanitizeRequiredText(value: string, maxLength = DEFAULT_MAX_LENGTH) {
  const sanitized = sanitizeOptionalText(value, maxLength);

  if (!sanitized) {
    return "";
  }

  return sanitized;
}

export function sanitizeFileName(value: string, maxLength = 255) {
  const sanitized = value
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();

  if (!sanitized) {
    return "upload";
  }

  return sanitized.slice(0, maxLength);
}

/** Prefix spreadsheet formula injection characters for CSV export cells. */
export function escapeCsvCell(value: string) {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}
