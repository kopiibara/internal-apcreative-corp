import type { PoolConfig } from "pg";

import {
  getResolvedDatabaseUrl,
  resolveDatabaseUrl,
} from "../lib/database-url";

function requiresRemoteSsl(connectionString: string) {
  try {
    const hostname = new URL(connectionString).hostname.toLowerCase();

    return (
      hostname.includes("neon.tech") ||
      hostname.includes("supabase.co") ||
      hostname.includes("amazonaws.com") ||
      hostname.includes("render.com") ||
      hostname.includes("railway.app")
    );
  } catch {
    return false;
  }
}

export function createScriptPoolConfig(
  connectionString?: string,
): PoolConfig {
  const resolvedConnectionString =
    connectionString ?? getResolvedDatabaseUrl();

  if (!resolvedConnectionString) {
    throw new Error(
      "DATABASE_URL (or LIVE_DATABASE_URL) is missing in .env",
    );
  }

  const useSsl =
    process.env.NODE_ENV === "production" ||
    requiresRemoteSsl(resolvedConnectionString);

  return {
    connectionString: resolvedConnectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function formatDatabaseConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DATABASE_URL (or LIVE_DATABASE_URL) is missing")) {
    return [
      "No database connection string found.",
      "",
      "Set DATABASE_URL in .env, or LIVE_DATABASE_URL if that is your live Neon URL.",
      "",
      `Original error: ${message}`,
    ].join("\n");
  }

  if (message.includes("exceeded the data transfer quota")) {
    return [
      "Database connection blocked: your hosted Postgres provider (likely Neon) has exceeded its data transfer quota.",
      "",
      "This is not a migration SQL error. To proceed:",
      "  1. Open your Neon dashboard and upgrade the plan or wait for the quota to reset.",
      "  2. Or point DATABASE_URL / LIVE_DATABASE_URL to a different database.",
      "  3. As a temporary workaround, run pending migration SQL manually in the provider SQL editor, then insert a row into schema_migrations for that filename.",
      "",
      `Original error: ${message}`,
    ].join("\n");
  }

  if (message.includes("password authentication failed")) {
    return [
      "Database connection failed: invalid database credentials.",
      "",
      "Check DATABASE_URL or LIVE_DATABASE_URL in your .env file and try again.",
      "",
      `Original error: ${message}`,
    ].join("\n");
  }

  return message;
}

export function getScriptDatabaseUrlLabel() {
  if (process.env.DATABASE_URL?.trim()) {
    return "DATABASE_URL";
  }

  if (resolveDatabaseUrl()) {
    return "LIVE_DATABASE_URL";
  }

  return "DATABASE_URL";
}
