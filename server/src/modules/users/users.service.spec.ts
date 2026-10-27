import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { UsersService } from './users.service';

const user: AuthUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    post: { count: jest.fn() },
  };
  const posts = { listByAuthor: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsService, useValue: posts },
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
  });
});
