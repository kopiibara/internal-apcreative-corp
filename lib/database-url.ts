function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.LIVE_DATABASE_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }

    return stripWrappingQuotes(candidate);
  }

  return undefined;
}

export function normalizeDatabaseUrl(connectionString: string | undefined) {
  if (!connectionString) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    if (
      sslMode === "prefer" ||
      sslMode === "require" ||
      sslMode === "verify-ca"
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }

    // node-postgres does not support libpq channel binding.
    url.searchParams.delete("channel_binding");

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getResolvedDatabaseUrl() {
  return normalizeDatabaseUrl(resolveDatabaseUrl());
}
