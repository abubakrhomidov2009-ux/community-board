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

  for (const key of ['JWT_EXPIRES_IN', 'REFRESH_EXPIRES_IN']) {
    const value = env[key];
    if (
      value !== undefined &&
      value !== '' &&
      (typeof value !== 'string' || !/^\d+[smhd]$/.test(value))
    ) {
      problems.push(`${key} must look like 15m, 12h or 30d`);
    }
  }
  const superEmail = env.SUPER_ADMIN_EMAIL;
  const superPassword = env.SUPER_ADMIN_PASSWORD;
  if (superEmail || superPassword) {
    if (
      typeof superEmail !== 'string' ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(superEmail)
    ) {
      problems.push('SUPER_ADMIN_EMAIL must be an email address');
    }
    if (
      typeof superPassword !== 'string' ||
      superPassword.length < 8 ||
      !/[A-Za-z]/.test(superPassword) ||
      !/\d/.test(superPassword)
    ) {
      problems.push(
        'SUPER_ADMIN_PASSWORD must be at least 8 characters with a letter and a digit',
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment (server/.env): ${problems.join('; ')}`,
    );
  }
  return env;
}
