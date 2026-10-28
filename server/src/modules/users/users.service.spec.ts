import { createHash } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Locale, Prisma, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PostsService } from '../posts/posts.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { UsersService } from './users.service';

const user: AuthUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  avatarUrl: null,
  avatarPublicId: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    post: { count: jest.fn() },
    emailVerificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const posts = { listByAuthor: jest.fn() };
  const mail = { sendVerificationEmail: jest.fn() };
  const cloudinary = { upload: jest.fn(), destroyMany: jest.fn() };
  const settings: Record<string, string> = {};
  const config = { get: jest.fn((key: string) => settings[key]) };

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const key of Object.keys(settings)) delete settings[key];
    config.get.mockImplementation((key: string) => settings[key]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsService, useValue: posts },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: config },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  async function expectNotFound(promise: Promise<unknown>) {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errorCode).toBe(ErrorCode.USER_NOT_FOUND);
    expect((error as AppException).getStatus()).toBe(HttpStatus.NOT_FOUND);
  }

  const publicRow = {
    id: 'u1',
    username: 'aziza',
    avatarUrl: null,
    createdAt: user.createdAt,
    isStudentVerified: true,
    isBlocked: false,
  };

  describe('getPublic', () => {
    it('returns public data only (no email, no id) with the active post count', async () => {
      prisma.user.findUnique.mockResolvedValue(publicRow);
      prisma.post.count.mockResolvedValue(4);
      const result = await service.getPublic('AZIZA');
      expect(result).toEqual({
        username: 'aziza',
        avatarUrl: null,
        createdAt: user.createdAt,
        isStudentVerified: true,
        activePostsCount: 4,
      });
      const args = (prisma.user.findUnique.mock.calls[0] as unknown[])[0] as {
        where: { username: string };
      };
      expect(args.where.username).toBe('aziza');
    });

    it('throws USER_NOT_FOUND for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectNotFound(service.getPublic('nobody'));
    });

    it('treats a blocked user as not found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...publicRow,
        isBlocked: true,
      });
      await expectNotFound(service.getPublic('aziza'));
    });
  });

  describe('listPosts', () => {
    it('asks the posts service for that author', async () => {
      prisma.user.findUnique.mockResolvedValue(publicRow);
      posts.listByAuthor.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      });
      await service.listPosts('aziza', { page: 1, limit: 20 }, user);
      expect(posts.listByAuthor).toHaveBeenCalledWith(
        'u1',
        { page: 1, limit: 20 },
        user,
      );
    });

    it('throws USER_NOT_FOUND for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectNotFound(service.listPosts('nobody', { page: 1, limit: 20 }));
    });
  });

  describe('requestUniversityEmail', () => {
    const dto = { universityEmail: 'madina@students.university.tj' };

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

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.emailVerificationToken.create.mockResolvedValue({ id: 't1' });
      mail.sendVerificationEmail.mockResolvedValue(undefined);
    });

    it('sends the email in the user language with a link that holds the token, and stores only its hash', async () => {
      settings.SITE_URL = 'https://site.example/';
      await service.requestUniversityEmail(
        { ...user, preferredLocale: Locale.TG },
        dto,
      );

      const sent = (
        mail.sendVerificationEmail.mock.calls[0] as unknown[]
      )[0] as {
        to: string;
        locale: Locale;
        link: string;
      };
      expect(sent.to).toBe(dto.universityEmail);
      expect(sent.locale).toBe(Locale.TG);
      const token = new URL(sent.link).searchParams.get('token') as string;
      expect(
        sent.link.startsWith(
          'https://site.example/tg/settings/verify-email?token=',
        ),
      ).toBe(true);
      expect(token).toHaveLength(64);

      const saved = (
        prisma.emailVerificationToken.create.mock.calls[0] as unknown[]
      )[0] as {
        data: { tokenHash: string; expiresAt: Date; universityEmail: string };
      };
      expect(saved.data.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
      expect(saved.data.tokenHash).not.toBe(token);
      const hours = (saved.data.expiresAt.getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeGreaterThan(23.9);
      expect(hours).toBeLessThan(24.1);
    });

    it('removes older unused links first', async () => {
      await service.requestUniversityEmail(user, dto);
      expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', usedAt: null },
      });
    });

    it('throws UNIVERSITY_DOMAIN_NOT_ALLOWED for a gmail address', async () => {
      await expectError(
        service.requestUniversityEmail(user, {
          universityEmail: 'a@gmail.com',
        }),
        ErrorCode.UNIVERSITY_DOMAIN_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('does not accept a look-alike domain such as evil-university.tj', async () => {
      await expectError(
        service.requestUniversityEmail(user, {
          universityEmail: 'a@evil-university.tj',
        }),
        ErrorCode.UNIVERSITY_DOMAIN_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('uses ALLOWED_UNIVERSITY_DOMAINS from the settings when it is set', async () => {
      settings.ALLOWED_UNIVERSITY_DOMAINS = 'tgu.tj, ttu.tj';
      await expect(
        service.requestUniversityEmail(user, { universityEmail: 'x@tgu.tj' }),
      ).resolves.toBeUndefined();
      await expectError(
        service.requestUniversityEmail(user, dto),
        ErrorCode.UNIVERSITY_DOMAIN_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws UNIVERSITY_EMAIL_TAKEN when another user already verified that email', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u9' });
      await expectError(
        service.requestUniversityEmail(user, dto),
        ErrorCode.UNIVERSITY_EMAIL_TAKEN,
        HttpStatus.CONFLICT,
      );
    });

    it('throws ALREADY_VERIFIED for a user who is already a student', async () => {
      await expectError(
        service.requestUniversityEmail(
          { ...user, isStudentVerified: true },
          dto,
        ),
        ErrorCode.ALREADY_VERIFIED,
        HttpStatus.CONFLICT,
      );
    });

    it('deletes the token again when the email cannot be sent', async () => {
      mail.sendVerificationEmail.mockRejectedValue(
        new AppException(ErrorCode.MAIL_SEND_FAILED, HttpStatus.BAD_GATEWAY),
      );
      await expectError(
        service.requestUniversityEmail(user, dto),
        ErrorCode.MAIL_SEND_FAILED,
        HttpStatus.BAD_GATEWAY,
      );
      expect(prisma.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
    });
  });

  describe('verifyUniversityEmail', () => {
    const token = 'a'.repeat(64);
    const record = (overrides: Record<string, unknown> = {}) => ({
      id: 't1',
      userId: 'u1',
      universityEmail: 'madina@students.university.tj',
      expiresAt: new Date(Date.now() + 3_600_000),
      usedAt: null,
      ...overrides,
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

    beforeEach(() => {
      prisma.$transaction.mockImplementation((operations: unknown[]) =>
        Promise.all(operations),
      );
      prisma.emailVerificationToken.update.mockReturnValue({ id: 't1' });
    });

    it('marks the token used and gives the student badge (never returns the password hash)', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValue(record());
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordHash: 'secret',
        isStudentVerified: true,
        universityEmail: 'madina@students.university.tj',
      });
      const result = await service.verifyUniversityEmail(user, { token });
      expect(result.isStudentVerified).toBe(true);
      expect(result.universityEmail).toBe('madina@students.university.tj');
      expect(result).not.toHaveProperty('passwordHash');
      const lookup = (
        prisma.emailVerificationToken.findFirst.mock.calls[0] as unknown[]
      )[0] as {
        where: { tokenHash: string; userId: string };
      };
      expect(lookup.where).toEqual({
        tokenHash: createHash('sha256').update(token).digest('hex'),
        userId: 'u1',
      });
    });

    it('throws VERIFICATION_TOKEN_INVALID for an unknown token, a used token, or a token of another user', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValue(null);
      await expectError(
        service.verifyUniversityEmail(user, { token }),
        ErrorCode.VERIFICATION_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
      );
      prisma.emailVerificationToken.findFirst.mockResolvedValue(
        record({ usedAt: new Date() }),
      );
      await expectError(
        service.verifyUniversityEmail(user, { token }),
        ErrorCode.VERIFICATION_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws VERIFICATION_TOKEN_EXPIRED after 24 hours', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValue(
        record({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expectError(
        service.verifyUniversityEmail(user, { token }),
        ErrorCode.VERIFICATION_TOKEN_EXPIRED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws ALREADY_VERIFIED for a user who is already a student', async () => {
      await expectError(
        service.verifyUniversityEmail(
          { ...user, isStudentVerified: true },
          { token },
        ),
        ErrorCode.ALREADY_VERIFIED,
        HttpStatus.CONFLICT,
      );
    });

    it('maps a database unique-key clash to UNIVERSITY_EMAIL_TAKEN', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValue(record());
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expectError(
        service.verifyUniversityEmail(user, { token }),
        ErrorCode.UNIVERSITY_EMAIL_TAKEN,
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('updateMe', () => {
    it('saves the language and never returns the password hash', async () => {
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordHash: 'secret',
        preferredLocale: Locale.TG,
      });
      const result = await service.updateMe(user, {
        preferredLocale: Locale.TG,
      });
      expect(result.preferredLocale).toBe(Locale.TG);
      expect(result).not.toHaveProperty('passwordHash');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { preferredLocale: Locale.TG },
      });
    });

    it('changes the username (lowercase already done by the DTO)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({ ...user, username: 'aziza_d' });
      const result = await service.updateMe(user, { username: 'aziza_d' });
      expect(result.username).toBe('aziza_d');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { username: 'aziza_d', preferredLocale: undefined },
      });
    });

    it('refuses a username that someone else has (USERNAME_TAKEN)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u9' });
      const error = await service
        .updateMe(user, { username: 'rustam' })
        .catch((e: unknown) => e);
      expect((error as AppException).errorCode).toBe(ErrorCode.USERNAME_TAKEN);
      expect((error as AppException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not look the name up again when it is my own name', async () => {
      prisma.user.update.mockResolvedValue(user);
      await service.updateMe(user, { username: 'aziza' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('maps a database unique-constraint race to USERNAME_TAKEN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      const error = await service
        .updateMe(user, { username: 'rustam' })
        .catch((e: unknown) => e);
      expect((error as AppException).errorCode).toBe(ErrorCode.USERNAME_TAKEN);
    });
  });

  describe('avatar', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ]);
    const file = (extra: Partial<Express.Multer.File> = {}) =>
      ({
        mimetype: 'image/png',
        size: png.length,
        buffer: png,
        ...extra,
      }) as Express.Multer.File;
    const code = async (promise: Promise<unknown>) =>
      ((await promise.catch((e: unknown) => e)) as AppException).errorCode;

    it('uploads a square picture, saves it and deletes the old one', async () => {
      cloudinary.upload.mockResolvedValue({
        url: 'https://c/new.jpg',
        publicId: 'new1',
      });
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordHash: 'secret',
        avatarUrl: 'https://c/new.jpg',
      });
      const withOld = {
        ...user,
        avatarUrl: 'https://c/old.jpg',
        avatarPublicId: 'old1',
      };
      const result = await service.setAvatar(withOld, file());
      expect(cloudinary.upload).toHaveBeenCalledWith(png, 'avatar');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: 'https://c/new.jpg', avatarPublicId: 'new1' },
      });
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['old1']);
      expect(result.avatarUrl).toBe('https://c/new.jpg');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('refuses no file, a wrong type, a fake image and a big file before uploading anything', async () => {
      await expect(code(service.setAvatar(user, undefined))).resolves.toBe(
        ErrorCode.VALIDATION_FAILED,
      );
      await expect(
        code(service.setAvatar(user, file({ mimetype: 'application/pdf' }))),
      ).resolves.toBe(ErrorCode.IMAGE_TYPE_INVALID);
      await expect(
        code(
          service.setAvatar(
            user,
            file({ buffer: Buffer.from('not an image at all') }),
          ),
        ),
      ).resolves.toBe(ErrorCode.IMAGE_TYPE_INVALID);
      await expect(
        code(service.setAvatar(user, file({ size: 6 * 1024 * 1024 }))),
      ).resolves.toBe(ErrorCode.IMAGE_TOO_LARGE);
      expect(cloudinary.upload).not.toHaveBeenCalled();
    });

    it('answers UPLOAD_FAILED when Cloudinary is down and keeps the old picture', async () => {
      cloudinary.upload.mockRejectedValue(new Error('boom'));
      await expect(code(service.setAvatar(user, file()))).resolves.toBe(
        ErrorCode.UPLOAD_FAILED,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deletes the new upload again when saving it fails', async () => {
      cloudinary.upload.mockResolvedValue({
        url: 'https://c/new.jpg',
        publicId: 'new1',
      });
      prisma.user.update.mockRejectedValue(new Error('db down'));
      await expect(service.setAvatar(user, file())).rejects.toThrow('db down');
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['new1']);
    });

    it('removes my picture and deletes it from Cloudinary; does nothing when I have none', async () => {
      await service.removeAvatar(user);
      expect(prisma.user.update).not.toHaveBeenCalled();

      prisma.user.update.mockResolvedValue({});
      await service.removeAvatar({
        ...user,
        avatarUrl: 'https://c/old.jpg',
        avatarPublicId: 'old1',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: null, avatarPublicId: null },
      });
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['old1']);
    });
  });
});
