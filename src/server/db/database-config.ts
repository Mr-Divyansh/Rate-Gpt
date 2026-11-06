export function getDatabaseConnectionString(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim() || undefined;
}
