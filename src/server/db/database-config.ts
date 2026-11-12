export function getDatabaseConnectionString(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim() || undefined;
}

/** Validates the configured PostgreSQL URL without exposing its contents. */
export function validateDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): { valid: boolean; message: string } {
  const url = getDatabaseConnectionString(env);
  if (!url) {
    return { valid: true, message: "No DATABASE_URL set - using SQLite (local dev)" };
  }
  try {
    const parsed = new URL(url);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.pathname.length < 2
    ) {
      return {
        valid: false,
        message:
          "DATABASE_URL must be a PostgreSQL URL with a host and database name.",
      };
    }
  } catch {
    return {
      valid: false,
      message: "DATABASE_URL is not a valid PostgreSQL connection URL.",
    };
  }
  return { valid: true, message: "PostgreSQL connection URL is valid" };
}
