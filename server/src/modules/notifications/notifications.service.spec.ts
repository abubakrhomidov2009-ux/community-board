import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, NotificationType, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

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

describe('NotificationsService', () => {
  let service: NotificationsService;
  const prisma = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  const firstArg = <T>(fn: jest.Mock): T =>
    (fn.mock.calls[0] as unknown[])[0] as T;

  describe('list', () => {
    it('lists only my notifications, newest first, with pagination info', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          userId: 'u1',
          type: NotificationType.NEW_COMMENT,
          postId: 'p1',
          conversationId: null,
          actorUsername: 'rustam',
          readAt: null,
          createdAt: new Date(),
        },
      ]);
      prisma.notification.count.mockResolvedValue(1);
      const result = await service.list(user, { page: 1, limit: 20 });
      const args = firstArg<{ where: { userId: string }; orderBy: unknown[] }>(
        prisma.notification.findMany,
      );
      expect(args.where.userId).toBe('u1');
      expect(args.orderBy[0]).toEqual({ createdAt: 'desc' });
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result.items[0]).not.toHaveProperty('userId');
    });
  });

  describe('unreadCount', () => {
    it('counts only my unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);
      await expect(service.unreadCount(user)).resolves.toEqual({ count: 3 });
      expect(
        firstArg<{ where: unknown }>(prisma.notification.count).where,
      ).toEqual({ userId: 'u1', readAt: null });
    });
  });

  describe('markRead', () => {
    it('throws NOTIFICATION_NOT_FOUND for an unknown notification', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      const error = await service.markRead(user, 'x').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).errorCode).toBe(
        ErrorCode.NOTIFICATION_NOT_FOUND,
      );
      expect((error as AppException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it("only looks at my own notifications (someone else's looks like it does not exist)", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      await service.markRead(other, 'n1').catch(() => undefined);
      expect(
        firstArg<{ where: unknown }>(prisma.notification.findFirst).where,
      ).toEqual({ id: 'n1', userId: 'u2' });
    });

    it('sets readAt once', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1' });
      await service.markRead(user, 'n1');
      const args = firstArg<{ where: unknown; data: { readAt: Date } }>(
        prisma.notification.updateMany,
      );
      expect(args.where).toEqual({ id: 'n1', readAt: null });
      expect(args.data.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAllRead', () => {
    it('marks all my unread notifications as read', async () => {
      await service.markAllRead(user);
      const args = firstArg<{ where: unknown }>(prisma.notification.updateMany);
      expect(args.where).toEqual({ userId: 'u1', readAt: null });
    });
  });

  describe('creating notifications', () => {
    it('notifies the post author about a comment, with the commenter name', async () => {
      await service.notifyNewComment('u2', user, 'p1');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'u2',
          type: NotificationType.NEW_COMMENT,
          postId: 'p1',
          actorUsername: 'aziza',
        },
      });
    });

    it('does not notify you about your own comment', async () => {
      await service.notifyNewComment('u1', user, 'p1');
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('notifies the author when an admin removes the post', async () => {
      await service.notifyPostRemoved('u2', 'p1');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'u2',
          type: NotificationType.POST_REMOVED,
          postId: 'p1',
        },
      });
    });

    it('sends only one unread "new message" notification per conversation', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1' });
      await service.notifyNewMessage('u2', user, 'c1');
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(
        firstArg<{ where: unknown }>(prisma.notification.findFirst).where,
      ).toEqual({
        userId: 'u2',
        type: NotificationType.NEW_MESSAGE,
        conversationId: 'c1',
        readAt: null,
      });
    });

    it('notifies the recipient of a new message', async () => {
      await service.notifyNewMessage('u2', user, 'c1');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'u2',
          type: NotificationType.NEW_MESSAGE,
          conversationId: 'c1',
          actorUsername: 'aziza',
        },
      });
    });
  });
});
