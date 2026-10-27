/** Stops the app at start-up with a clear message if a required setting is missing. */
export function validateEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const problems: string[] = [];

  if (
    typeof env.DATABASE_URL !== 'string' ||
    !env.DATABASE_URL.startsWith('postgres')
  ) {
    problems.push('DATABASE_URL must be a PostgreSQL connection string');
  }
  if (typeof env.JWT_SECRET !== 'string' || env.JWT_SECRET.length < 16) {
    problems.push('JWT_SECRET must be at least 16 characters');
  }
  const sameSite = env.COOKIE_SAMESITE;
  if (
    sameSite !== undefined &&
    (typeof sameSite !== 'string' ||
      !['lax', 'strict', 'none'].includes(sameSite.toLowerCase()))
  ) {
    problems.push('COOKIE_SAMESITE must be lax, strict or none');
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment (server/.env): ${problems.join('; ')}`,
    );
  }
  return env;
}
