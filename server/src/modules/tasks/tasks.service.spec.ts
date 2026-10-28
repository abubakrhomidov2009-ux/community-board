import { Test } from '@nestjs/testing';
import { NotificationType, PostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  const prisma = {
    post: { findMany: jest.fn(), updateMany: jest.fn() },
    notification: { createMany: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const posts = { expireOverdue: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operations: unknown[]) =>
      Promise.resolve(operations),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsService, useValue: posts },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  describe('sendExpiryWarnings', () => {
    const now = new Date('2026-03-10T03:00:00Z');

    it('does nothing when no post is about to expire', async () => {
      prisma.post.findMany.mockResolvedValue([]);
      await expect(service.sendExpiryWarnings(now)).resolves.toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('looks for ACTIVE posts expiring within 3 days that were not warned yet', async () => {
      prisma.post.findMany.mockResolvedValue([]);
      await service.sendExpiryWarnings(now);
      const args = (prisma.post.findMany.mock.calls[0] as unknown[])[0] as {
        where: {
          status: PostStatus;
          expiresAt: { gt: Date; lte: Date };
          expiryWarningSentAt: null;
        };
      };
      expect(args.where.status).toBe(PostStatus.ACTIVE);
      expect(args.where.expiryWarningSentAt).toBeNull();
      expect(args.where.expiresAt.gt).toEqual(now);
      expect(args.where.expiresAt.lte).toEqual(
        new Date('2026-03-13T03:00:00Z'),
      );
    });

    it('creates one POST_EXPIRING notification per post and marks them as warned', async () => {
      prisma.post.findMany.mockResolvedValue([
        { id: 'p1', authorId: 'u1' },
        { id: 'p2', authorId: 'u2' },
      ]);
      await expect(service.sendExpiryWarnings(now)).resolves.toBe(2);

      const notification = (
        prisma.notification.createMany.mock.calls[0] as unknown[]
      )[0] as {
        data: { userId: string; type: NotificationType; postId: string }[];
      };
      expect(notification.data).toEqual([
        { userId: 'u1', type: NotificationType.POST_EXPIRING, postId: 'p1' },
        { userId: 'u2', type: NotificationType.POST_EXPIRING, postId: 'p2' },
      ]);
      const update = (prisma.post.updateMany.mock.calls[0] as unknown[])[0] as {
        where: { id: { in: string[] } };
        data: { expiryWarningSentAt: Date };
      };
      expect(update.where.id.in).toEqual(['p1', 'p2']);
      expect(update.data.expiryWarningSentAt).toEqual(now);
    });
  });

  describe('runDaily', () => {
    it('expires overdue posts (forced) and sends the warnings', async () => {
      posts.expireOverdue.mockResolvedValue(3);
      prisma.post.findMany.mockResolvedValue([]);
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      await service.runDaily();
      expect(posts.expireOverdue).toHaveBeenCalledWith(true);
      expect(prisma.post.findMany).toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });

  describe('deleteOldRefreshTokens', () => {
    it('deletes expired tokens and tokens revoked more than a day ago', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });
      const now = new Date('2026-03-10T03:00:00Z');
      await expect(service.deleteOldRefreshTokens(now)).resolves.toBe(5);
      const args = (
        prisma.refreshToken.deleteMany.mock.calls[0] as unknown[]
      )[0] as {
        where: { OR: Array<Record<string, { lt: Date }>> };
      };
      expect(args.where.OR[0].expiresAt.lt).toEqual(now);
      expect(args.where.OR[1].revokedAt.lt).toEqual(
        new Date('2026-03-09T03:00:00Z'),
      );
      expect(args.where.OR[2].rotatedAt.lt).toEqual(
        new Date('2026-03-09T03:00:00Z'),
      );
    });
  });
});
