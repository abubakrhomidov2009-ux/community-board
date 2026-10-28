import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE } from '../../common/guards/jwt-auth.guard';
import { parseDurationMs } from '../../common/utils/duration';

export const REFRESH_COOKIE = 'refresh_token';

/** The login token is short-lived; the refresh token (below) quietly gets a new one. */
export const DEFAULT_ACCESS_EXPIRES_IN = '15m';
export const DEFAULT_REFRESH_EXPIRES_IN = '30d';

function baseOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const sameSite = (
    config.get<string>('COOKIE_SAMESITE') ?? 'lax'
  ).toLowerCase() as 'lax' | 'strict' | 'none';
  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
  };
}

/**
 * Cookie settings for the login token.
 * Default (proxy setup): SameSite=Lax. Fallback (cross-domain): COOKIE_SAMESITE=none, which needs Secure.
 */
export function accessCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseOptions(config),
    maxAge: parseDurationMs(
      config.get<string>('JWT_EXPIRES_IN') ?? DEFAULT_ACCESS_EXPIRES_IN,
    ),
  };
}

/** The refresh token is only sent to /api/auth/*, never with normal requests. */
export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseOptions(config),
    path: '/api/auth',
    maxAge: refreshLifetimeMs(config),
  };
}

export function refreshLifetimeMs(config: ConfigService): number {
  return parseDurationMs(
    config.get<string>('REFRESH_EXPIRES_IN') ?? DEFAULT_REFRESH_EXPIRES_IN,
  );
}

export function setSessionCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions(config));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(config));
}

export function clearSessionCookies(
  res: Response,
  config: ConfigService,
): void {
  const { maxAge: _a, ...access } = accessCookieOptions(config);
  const { maxAge: _r, ...refresh } = refreshCookieOptions(config);
  res.clearCookie(ACCESS_COOKIE, access);
  res.clearCookie(REFRESH_COOKIE, refresh);
}
