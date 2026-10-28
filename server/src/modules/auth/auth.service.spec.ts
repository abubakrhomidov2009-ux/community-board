import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Locale, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import { hashToken } from '../../common/utils/hash-token';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

const baseUser = {
  id: 'user1',
  email: 'aziza@example.com',
  username: 'aziza',
  passwordHash: '',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  avatarUrl: null,
  avatarPublicId: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-03-01T10:00:00Z'),
  updatedAt: new Date('2026-03-01T10:00:00Z'),
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwt.signAsync.mockResolvedValue('signed-token');
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  async function expectError(
    promise: Promise<unknown>,
    code: ErrorCode,
    status: HttpStatus,
  ) {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errorCode).toBe(code);
    expect((error as AppException).getStatus()).toBe(status);
  }

  describe('register', () => {
    const dto = {
      email: 'aziza@example.com',
      username: 'aziza',
      password: 'Demo12345',
    };

    it('creates the user, hashes the password and returns a token without the hash', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseUser, ...data }),
      );

      const result = await service.register(dto);

      const [createArgs] = prisma.user.create.mock.calls[0] as [
        { data: { passwordHash: string } },
      ];
      const saved = createArgs.data;
      expect(saved.passwordHash).not.toBe('Demo12345');
      await expect(
        bcrypt.compare('Demo12345', saved.passwordHash),
      ).resolves.toBe(true);
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toHaveLength(96);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.username).toBe('aziza');
      // Only a hash of the refresh token is saved.
      const [saved2] = prisma.refreshToken.create.mock.calls[0] as [
        { data: { tokenHash: string } },
      ];
      expect(saved2.data.tokenHash).toBe(hashToken(result.refreshToken));
      expect(saved2.data.tokenHash).not.toBe(result.refreshToken);
    });

    it('throws EMAIL_TAKEN when the email exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        email: dto.email,
        username: 'other',
      });
      await expectError(
        service.register(dto),
        ErrorCode.EMAIL_TAKEN,
        HttpStatus.CONFLICT,
      );
    });

    it('throws USERNAME_TAKEN when the username exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        email: 'other@example.com',
        username: dto.username,
      });
      await expectError(
        service.register(dto),
        ErrorCode.USERNAME_TAKEN,
        HttpStatus.CONFLICT,
      );
    });

    it('maps a database unique-constraint race to USERNAME_TAKEN', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['username'] },
        }),
      );
      await expectError(
        service.register(dto),
        ErrorCode.USERNAME_TAKEN,
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('login', () => {
    let passwordHash: string;
    beforeAll(async () => {
      passwordHash = await bcrypt.hash('Demo12345', 4);
    });

    it('returns the user and a token for the right password', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, passwordHash });
      const result = await service.login({
        emailOrUsername: 'aziza',
        password: 'Demo12345',
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toHaveLength(96);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws INVALID_CREDENTIALS for a wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, passwordHash });
      await expectError(
        service.login({ emailOrUsername: 'aziza', password: 'wrong-pass1' }),
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('throws INVALID_CREDENTIALS for an unknown user (same answer as a wrong password)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expectError(
        service.login({ emailOrUsername: 'nobody', password: 'Demo12345' }),
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('throws USER_BLOCKED for a blocked user with the right password', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        passwordHash,
        isBlocked: true,
      });
      await expectError(
        service.login({ emailOrUsername: 'aziza', password: 'Demo12345' }),
        ErrorCode.USER_BLOCKED,
        HttpStatus.FORBIDDEN,
      );
    });

    it('does not reveal that an account is blocked when the password is wrong', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        passwordHash,
        isBlocked: true,
      });
      await expectError(
        service.login({ emailOrUsername: 'aziza', password: 'wrong-pass1' }),
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('refresh', () => {
    const now = () => new Date();
    const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
    const record = (extra: Record<string, unknown> = {}) => ({
      id: 'rt1',
      userId: 'user1',
      tokenHash: 'h',
      expiresAt: future(),
      rotatedAt: null,
      revokedAt: null,
      user: { ...baseUser },
      ...extra,
    });

    it('replaces a valid refresh token: the old one is revoked and a new pair is returned', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(record());
      const result = await service.refresh('raw-token');
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: hashToken('raw-token') },
        }),
      );
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { rotatedAt: expect.any(Date) as Date },
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).not.toBe('raw-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('refuses a missing, unknown or expired token (REFRESH_TOKEN_INVALID)', async () => {
      await expectError(
        service.refresh(undefined),
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expectError(
        service.refresh('nope'),
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expectError(
        service.refresh('old'),
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('treats an old replaced token as stolen: closes every session of that user', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ rotatedAt: new Date(Date.now() - 60 * 1000) }),
      );
      await expectError(
        service.refresh('replaced'),
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('still works for a token that was replaced a moment ago (two tabs at once)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ rotatedAt: new Date(now().getTime() - 2000) }),
      );
      const result = await service.refresh('just-replaced');
      expect(result.accessToken).toBe('signed-token');
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('never accepts a token that was closed for good (logout, password change), even a second later', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ revokedAt: new Date(now().getTime() - 1000) }),
      );
      await expectError(
        service.refresh('logged-out'),
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('refuses a blocked user and closes their sessions (USER_BLOCKED)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ user: { ...baseUser, isBlocked: true } }),
      );
      await expectError(
        service.refresh('raw'),
        ErrorCode.USER_BLOCKED,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the refresh token of this device', async () => {
      await service.logout('raw-token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashToken('raw-token'), revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('does nothing and does not fail without a token', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    let passwordHash: string;
    beforeAll(async () => {
      passwordHash = await bcrypt.hash('Demo12345', 4);
    });
    const { passwordHash: _hash, ...me } = baseUser;

    it('saves the new password hashed, closes all sessions and starts a new one', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash });
      prisma.user.update.mockResolvedValue({});
      const result = await service.changePassword(me, {
        currentPassword: 'Demo12345',
        newPassword: 'NewPass6789',
      });
      const [args] = prisma.user.update.mock.calls[0] as [
        { data: { passwordHash: string } },
      ];
      await expect(
        bcrypt.compare('NewPass6789', args.data.passwordHash),
      ).resolves.toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('refuses a wrong current password (CURRENT_PASSWORD_INCORRECT, 400 so the app does not log out)', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash });
      await expectError(
        service.changePassword(me, {
          currentPassword: 'Wrong12345',
          newPassword: 'NewPass6789',
        }),
        ErrorCode.CURRENT_PASSWORD_INCORRECT,
        HttpStatus.BAD_REQUEST,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses the same password again (VALIDATION_FAILED on newPassword)', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash });
      await expectError(
        service.changePassword(me, {
          currentPassword: 'Demo12345',
          newPassword: 'Demo12345',
        }),
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
      );
    });
  });
});
