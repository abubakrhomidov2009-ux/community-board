import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import { parseDurationMs } from '../../common/utils/duration';

/**
 * Cookie settings for the login token.
 * Default (proxy setup): SameSite=Lax. Fallback (cross-domain): COOKIE_SAMESITE=none, which needs Secure.
 */
export function accessCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const sameSite = (
    config.get<string>('COOKIE_SAMESITE') ?? 'lax'
  ).toLowerCase() as 'lax' | 'strict' | 'none';
  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: parseDurationMs(config.get<string>('JWT_EXPIRES_IN')),
  };
}
