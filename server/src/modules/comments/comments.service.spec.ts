import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, PostStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommentsService } from './comments.service';

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
const other: AuthUser = { ...user, id: 'u2', username: 'rustam' };
const admin: AuthUser = {
  ...user,
  id: 'u3',
  username: 'admin',
  role: Role.ADMIN,
};

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

const makeComment = () => ({
  id: 'c1',
  body: 'Is this still available?',
  postId: 'p1',
  authorId: 'u1',
  createdAt: new Date('2026-03-02T11:00:00Z'),
  author: { username: 'aziza', isStudentVerified: false },
});

describe('CommentsService', () => {
  let service: CommentsService;
  const prisma = {
    post: { findUnique: jest.fn() },
    comment: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
  const notifications = { notifyNewComment: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(CommentsService);
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

  describe('list', () => {
    it('throws POST_NOT_FOUND for an unknown or removed post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.list('x', { page: 1, limit: 20 }),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.REMOVED,
        expiresAt: future,
      });
      await expectError(
        service.list('p1', { page: 1, limit: 20 }),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('returns comments oldest first with pagination info and no author ids', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: future,
      });
      prisma.comment.findMany.mockResolvedValue([makeComment()]);
      prisma.comment.count.mockResolvedValue(1);
      const result = await service.list('p1', { page: 1, limit: 20 });
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result.items[0]).not.toHaveProperty('authorId');
      const args = (prisma.comment.findMany.mock.calls[0] as unknown[])[0] as {
        orderBy: unknown[];
      };
      expect(args.orderBy[0]).toEqual({ createdAt: 'asc' });
    });
  });

  describe('create', () => {
    it('tells the post author about the new comment', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: future,
        authorId: 'u2',
      });
      prisma.comment.create.mockResolvedValue(makeComment());
      await service.create(user, 'p1', { body: 'Is this still available?' });
      expect(notifications.notifyNewComment).toHaveBeenCalledWith(
        'u2',
        user,
        'p1',
      );
    });

    it('creates a comment on an ACTIVE post', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: future,
      });
      prisma.comment.create.mockResolvedValue(makeComment());
      const result = await service.create(user, 'p1', {
        body: 'Is this still available?',
      });
      expect(result.body).toBe('Is this still available?');
      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            body: 'Is this still available?',
            postId: 'p1',
            authorId: 'u1',
          },
        }),
      );
    });

    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.create(user, 'x', { body: 'Hi' }),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it.each([PostStatus.RESOLVED, PostStatus.EXPIRED])(
      'throws POST_NOT_ACTIVE on a %s post',
      async (status) => {
        prisma.post.findUnique.mockResolvedValue({
          id: 'p1',
          status,
          expiresAt: future,
        });
        await expectError(
          service.create(user, 'p1', { body: 'Hi' }),
          ErrorCode.POST_NOT_ACTIVE,
          HttpStatus.CONFLICT,
        );
      },
    );

    it('throws POST_NOT_ACTIVE when the post is past its expiry date', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: past,
      });
      await expectError(
        service.create(user, 'p1', { body: 'Hi' }),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('remove', () => {
    it('throws COMMENT_NOT_FOUND for an unknown comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await expectError(
        service.remove(user, 'x'),
        ErrorCode.COMMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws COMMENT_NOT_OWNER for another normal user', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1' });
      await expectError(
        service.remove(other, 'c1'),
        ErrorCode.COMMENT_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('lets the author delete', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1' });
      await service.remove(user, 'c1');
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });

    it('lets an admin delete any comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1' });
      await service.remove(admin, 'c1');
      expect(prisma.comment.delete).toHaveBeenCalled();
    });
  });
});
