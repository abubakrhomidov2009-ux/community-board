import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Locale, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
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
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-03-01T10:00:00Z'),
  updatedAt: new Date('2026-03-01T10:00:00Z'),
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = { user: { findFirst: jest.fn(), create: jest.fn() } };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwt.signAsync.mockResolvedValue('signed-token');
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
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
      expect(result.token).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.username).toBe('aziza');
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
      expect(result.token).toBe('signed-token');
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
});
