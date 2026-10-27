import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Locale, Role } from '@prisma/client';
import { AppException } from '../app.exception';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorCode } from '../error-code';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';
import { NotBlockedGuard } from './not-blocked.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AppThrottlerGuard } from './app-throttler.guard';

const dbUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  passwordHash: 'secret-hash',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

async function expectError(
  promise: Promise<unknown> | (() => unknown),
  code: ErrorCode,
  status: HttpStatus,
) {
  const error = await (
    typeof promise === 'function' ? Promise.resolve().then(promise) : promise
  ).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).errorCode).toBe(code);
  expect((error as AppException).getStatus()).toBe(status);
}

describe('JwtAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
  });

  it('lets a valid cookie through and puts the user (without the password hash) on the request', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue(dbUser);
    const request = {
      cookies: { access_token: 'good-token' },
    } as unknown as AuthenticatedRequest;
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'u1', username: 'aziza' });
    expect(request.user).not.toHaveProperty('passwordHash');
  });

  it('refuses a request without a cookie (UNAUTHORIZED)', async () => {
    await expectError(
      guard.canActivate(contextFor({ cookies: {} })),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
    await expectError(
      guard.canActivate(contextFor({})),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('refuses a forged or expired token (UNAUTHORIZED)', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expectError(
      guard.canActivate(
        contextFor({
          cookies: { access_token: 'forged' },
        }),
      ),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a token of a user who no longer exists (UNAUTHORIZED)', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'gone' });
    prisma.user.findUnique.mockResolvedValue(null);
    await expectError(
      guard.canActivate(
        contextFor({
          cookies: { access_token: 'good-token' },
        }),
      ),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('refuses a blocked user even with a valid token (USER_BLOCKED)', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, isBlocked: true });
    await expectError(
      guard.canActivate(
        contextFor({
          cookies: { access_token: 'good-token' },
        }),
      ),
      ErrorCode.USER_BLOCKED,
      HttpStatus.FORBIDDEN,
    );
  });
});

describe('OptionalJwtAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  let guard: OptionalJwtAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new OptionalJwtAuthGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
  });

  it('never refuses: guests, bad tokens and blocked users simply are not logged in', async () => {
    const guest = {} as AuthenticatedRequest;
    await expect(guard.canActivate(contextFor(guest))).resolves.toBe(true);
    expect(guest.user).toBeUndefined();

    jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    const bad = {
      cookies: { access_token: 'x' },
    } as unknown as AuthenticatedRequest;
    await expect(guard.canActivate(contextFor(bad))).resolves.toBe(true);
    expect(bad.user).toBeUndefined();

    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, isBlocked: true });
    const blocked = {
      cookies: { access_token: 'x' },
    } as unknown as AuthenticatedRequest;
    await expect(guard.canActivate(contextFor(blocked))).resolves.toBe(true);
    expect(blocked.user).toBeUndefined();
  });

  it('sets the user for a valid login', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue(dbUser);
    const request = {
      cookies: { access_token: 'x' },
    } as unknown as AuthenticatedRequest;
    await guard.canActivate(contextFor(request));
    expect(request.user?.id).toBe('u1');
  });
});

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: RolesGuard;
  const { passwordHash: _hash, ...safe } = dbUser;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('lets everybody through when no role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ user: safe }))).toBe(true);
  });

  it('lets an admin into an admin endpoint and reads the metadata key "roles"', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(
      guard.canActivate(contextFor({ user: { ...safe, role: Role.ADMIN } })),
    ).toBe(true);
    expect((reflector.getAllAndOverride.mock.calls[0] as unknown[])[0]).toBe(
      ROLES_KEY,
    );
  });

  it('refuses a normal user with ADMIN_ONLY and a guest with UNAUTHORIZED', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    await expectError(
      () => guard.canActivate(contextFor({ user: safe })),
      ErrorCode.ADMIN_ONLY,
      HttpStatus.FORBIDDEN,
    );
    await expectError(
      () => guard.canActivate(contextFor({})),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
  });
});

describe('NotBlockedGuard', () => {
  const guard = new NotBlockedGuard();
  const { passwordHash: _hash, ...safe } = dbUser;

  it('lets a normal user through', () => {
    expect(guard.canActivate(contextFor({ user: safe }))).toBe(true);
  });

  it('refuses a blocked user (USER_BLOCKED) and a missing user (UNAUTHORIZED)', async () => {
    await expectError(
      () =>
        guard.canActivate(contextFor({ user: { ...safe, isBlocked: true } })),
      ErrorCode.USER_BLOCKED,
      HttpStatus.FORBIDDEN,
    );
    await expectError(
      () => guard.canActivate(contextFor({})),
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
  });
});

describe('AppThrottlerGuard', () => {
  const original = process.env.THROTTLE_DISABLED;
  afterEach(() => {
    process.env.THROTTLE_DISABLED = original;
  });

  it('skips the rate limit only when THROTTLE_DISABLED is "true"', async () => {
    const guard = Object.create(AppThrottlerGuard.prototype) as {
      shouldSkip: () => Promise<boolean>;
    };
    process.env.THROTTLE_DISABLED = 'true';
    await expect(guard.shouldSkip()).resolves.toBe(true);
    process.env.THROTTLE_DISABLED = 'false';
    await expect(guard.shouldSkip()).resolves.toBe(false);
    delete process.env.THROTTLE_DISABLED;
    await expect(guard.shouldSkip()).resolves.toBe(false);
  });
});
