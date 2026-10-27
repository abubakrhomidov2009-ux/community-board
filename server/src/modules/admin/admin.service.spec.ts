import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, PostStatus, ReportStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminService } from './admin.service';

const admin: AuthUser = {
  id: 'a1',
  email: 'admin@example.com',
  username: 'admin',
  role: Role.ADMIN,
  isBlocked: false,
  universityEmail: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const postRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'Spam post',
  category: 'OTHER',
  district: 'SINO',
  status: PostStatus.REMOVED,
  removedReason: 'Spam',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86_400_000),
  author: { username: 'rustam' },
  _count: { reports: 0 },
  ...overrides,
});

describe('AdminService', () => {
  let service: AdminService;
  const prisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    post: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    report: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const notifications = { notifyPostRemoved: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operations: unknown[]) =>
      Promise.resolve(operations),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  const firstArg = <T>(fn: jest.Mock): T =>
    (fn.mock.calls[0] as unknown[])[0] as T;

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

  describe('stats', () => {
    it('returns the numbers for the dashboard', async () => {
      prisma.user.count.mockResolvedValueOnce(120).mockResolvedValueOnce(2);
      prisma.post.count.mockResolvedValueOnce(340).mockResolvedValueOnce(210);
      prisma.report.count.mockResolvedValue(7);
      await expect(service.stats()).resolves.toEqual({
        users: 120,
        posts: 340,
        activePosts: 210,
        reportsOpen: 7,
        blockedUsers: 2,
      });
    });
  });

  describe('listReports', () => {
    it('filters by status, sorts as asked and paginates', async () => {
      prisma.report.findMany.mockResolvedValue([
        {
          id: 'r1',
          reason: 'SPAM',
          details: null,
          status: ReportStatus.OPEN,
          createdAt: new Date(),
          resolvedAt: null,
          post: {
            id: 'p1',
            title: 'Spam',
            status: 'ACTIVE',
            author: { username: 'rustam' },
          },
          reporter: { username: 'aziza' },
        },
      ]);
      prisma.report.count.mockResolvedValue(11);
      const result = await service.listReports({
        page: 2,
        limit: 5,
        status: ReportStatus.OPEN,
        sortBy: 'reason',
        order: 'asc',
      });
      const args = firstArg<{
        where: unknown;
        orderBy: unknown[];
        skip: number;
        take: number;
      }>(prisma.report.findMany);
      expect(args.where).toEqual({ status: ReportStatus.OPEN });
      expect(args.orderBy[0]).toEqual({ reason: 'asc' });
      expect([args.skip, args.take]).toEqual([5, 5]);
      expect(result).toMatchObject({
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
      });
      expect(result.items[0].reporter).toEqual({ username: 'aziza' });
    });
  });

  describe('updateReport', () => {
    it('throws REPORT_NOT_FOUND for an unknown report', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expectError(
        service.updateReport('x', { status: 'DISMISSED' }),
        ErrorCode.REPORT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('saves the new status and the time it was closed', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.report.update.mockResolvedValue({
        id: 'r1',
        reason: 'SPAM',
        details: null,
        status: ReportStatus.DISMISSED,
        createdAt: new Date(),
        resolvedAt: new Date(),
        post: {
          id: 'p1',
          title: 'T',
          status: 'ACTIVE',
          author: { username: 'rustam' },
        },
        reporter: { username: 'aziza' },
      });
      await service.updateReport('r1', { status: 'DISMISSED' });
      const args = firstArg<{ data: { status: string; resolvedAt: Date } }>(
        prisma.report.update,
      );
      expect(args.data.status).toBe('DISMISSED');
      expect(args.data.resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('removePost', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.removePost('x', {}),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('removes the post, closes its open reports and tells the author', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'u2',
        status: PostStatus.ACTIVE,
      });
      prisma.post.findUniqueOrThrow.mockResolvedValue(postRow());
      const result = await service.removePost('p1', { reason: 'Spam' });

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: PostStatus.REMOVED, removedReason: 'Spam' },
      });
      const reports = firstArg<{ where: unknown; data: { status: string } }>(
        prisma.report.updateMany,
      );
      expect(reports.where).toEqual({
        postId: 'p1',
        status: ReportStatus.OPEN,
      });
      expect(reports.data.status).toBe(ReportStatus.RESOLVED);
      expect(notifications.notifyPostRemoved).toHaveBeenCalledWith('u2', 'p1');
      expect(result.status).toBe(PostStatus.REMOVED);
    });

    it('does nothing again (and sends no second notification) for an already removed post', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'u2',
        status: PostStatus.REMOVED,
      });
      prisma.post.findUniqueOrThrow.mockResolvedValue(postRow());
      await service.removePost('p1', {});
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notifications.notifyPostRemoved).not.toHaveBeenCalled();
    });
  });

  describe('restorePost', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.restorePost('x'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws POST_NOT_ACTIVE when the post was not removed', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: new Date(),
      });
      await expectError(
        service.restorePost('p1'),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });

    it('brings a removed post back as ACTIVE, or as EXPIRED when its date has passed', async () => {
      prisma.post.findUniqueOrThrow.mockResolvedValue(
        postRow({ status: PostStatus.ACTIVE }),
      );
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.REMOVED,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      await service.restorePost('p1');
      expect(
        firstArg<{ data: { status: PostStatus; removedReason: null } }>(
          prisma.post.update,
        ).data,
      ).toEqual({
        status: PostStatus.ACTIVE,
        removedReason: null,
      });

      prisma.post.update.mockClear();
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.REMOVED,
        expiresAt: new Date(Date.now() - 86_400_000),
      });
      await service.restorePost('p1');
      expect(
        firstArg<{ data: { status: PostStatus } }>(prisma.post.update).data
          .status,
      ).toBe(PostStatus.EXPIRED);
    });
  });

  describe('users', () => {
    const userRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'u2',
      email: 'rustam@example.com',
      username: 'rustam',
      role: Role.USER,
      isBlocked: false,
      isStudentVerified: false,
      createdAt: new Date(),
      _count: { posts: 3 },
      ...overrides,
    });

    it('lists users with search and the blocked filter, without password hashes', async () => {
      prisma.user.findMany.mockResolvedValue([userRow()]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.listUsers({
        page: 1,
        limit: 20,
        q: 'rus',
        isBlocked: false,
        sortBy: 'username',
        order: 'asc',
      });
      const args = firstArg<{
        where: { isBlocked: boolean; OR: unknown[] };
        select: Record<string, unknown>;
      }>(prisma.user.findMany);
      expect(args.where.isBlocked).toBe(false);
      expect(args.where.OR).toHaveLength(2);
      expect(args.select).not.toHaveProperty('passwordHash');
      expect(result.items[0]).toMatchObject({
        username: 'rustam',
        postsCount: 3,
      });
      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });

    it('blocks a normal user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      prisma.user.update.mockResolvedValue(userRow({ isBlocked: true }));
      const result = await service.blockUser(admin, 'u2');
      expect(firstArg<{ data: unknown }>(prisma.user.update).data).toEqual({
        isBlocked: true,
      });
      expect(result.isBlocked).toBe(true);
    });

    it('refuses to block an admin or yourself (CANNOT_BLOCK_ADMIN)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a9', role: Role.ADMIN });
      await expectError(
        service.blockUser(admin, 'a9'),
        ErrorCode.CANNOT_BLOCK_ADMIN,
        HttpStatus.BAD_REQUEST,
      );
      prisma.user.findUnique.mockResolvedValue({ id: 'a1', role: Role.USER });
      await expectError(
        service.blockUser(admin, 'a1'),
        ErrorCode.CANNOT_BLOCK_ADMIN,
        HttpStatus.BAD_REQUEST,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws USER_NOT_FOUND for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectError(
        service.blockUser(admin, 'x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      await expectError(
        service.unblockUser('x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('unblocks a user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      prisma.user.update.mockResolvedValue(userRow({ isBlocked: false }));
      const result = await service.unblockUser('u2');
      expect(firstArg<{ data: unknown }>(prisma.user.update).data).toEqual({
        isBlocked: false,
      });
      expect(result.isBlocked).toBe(false);
    });
  });
});
