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
  avatarUrl: null,
  avatarPublicId: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const superAdmin: AuthUser = {
  ...admin,
  id: 's1',
  username: 'owner',
  role: Role.SUPER_ADMIN,
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
  author: { id: 'u2', username: 'rustam' },
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
    comment: { count: jest.fn() },
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
          reporter: { id: 'u1', username: 'aziza' },
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
      expect(result.items[0].reporter).toEqual({ id: 'u1', username: 'aziza' });
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
          author: { id: 'u2', username: 'rustam' },
        },
        reporter: { id: 'u1', username: 'aziza' },
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
        service.removePost(admin, 'x', {}),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('removes the post, closes its open reports and tells the author', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'u2',
        status: PostStatus.ACTIVE,
        author: { role: Role.USER },
      });
      prisma.post.findUniqueOrThrow.mockResolvedValue(postRow());
      const result = await service.removePost(admin, 'p1', { reason: 'Spam' });

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
        author: { role: Role.USER },
      });
      prisma.post.findUniqueOrThrow.mockResolvedValue(postRow());
      await service.removePost(admin, 'p1', {});
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notifications.notifyPostRemoved).not.toHaveBeenCalled();
    });
  });

  describe('restorePost', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.restorePost(admin, 'x'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws POST_NOT_ACTIVE when the post was not removed', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        status: PostStatus.ACTIVE,
        expiresAt: new Date(),
        author: { role: Role.USER },
      });
      await expectError(
        service.restorePost(admin, 'p1'),
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
        author: { role: Role.USER },
      });
      await service.restorePost(admin, 'p1');
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
        author: { role: Role.USER },
      });
      await service.restorePost(admin, 'p1');
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

    it('an admin cannot block another admin or themselves (FORBIDDEN_ROLE)', async () => {
      for (const id of ['a9', 'a1']) {
        prisma.user.findUnique.mockResolvedValue({ id, role: Role.ADMIN });
        await expectError(
          service.blockUser(admin, id),
          ErrorCode.FORBIDDEN_ROLE,
          HttpStatus.FORBIDDEN,
        );
      }
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('nobody can block the super admin (CANNOT_CHANGE_SUPER_ADMIN), not even the super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 's1',
        role: Role.SUPER_ADMIN,
      });
      for (const actor of [admin, superAdmin]) {
        await expectError(
          service.blockUser(actor, 's1'),
          ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
          HttpStatus.FORBIDDEN,
        );
      }
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('the super admin can block and unblock an admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a9', role: Role.ADMIN });
      prisma.user.update.mockResolvedValue(
        userRow({ id: 'a9', role: Role.ADMIN, isBlocked: true }),
      );
      await expect(service.blockUser(superAdmin, 'a9')).resolves.toMatchObject({
        isBlocked: true,
      });
      prisma.user.update.mockResolvedValue(
        userRow({ id: 'a9', role: Role.ADMIN, isBlocked: false }),
      );
      await expect(
        service.unblockUser(superAdmin, 'a9'),
      ).resolves.toMatchObject({ isBlocked: false });
    });

    it('an admin cannot unblock another admin or the super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a9', role: Role.ADMIN });
      await expectError(
        service.unblockUser(admin, 'a9'),
        ErrorCode.FORBIDDEN_ROLE,
        HttpStatus.FORBIDDEN,
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 's1',
        role: Role.SUPER_ADMIN,
      });
      await expectError(
        service.unblockUser(admin, 's1'),
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    });

    it('throws USER_NOT_FOUND for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectError(
        service.blockUser(admin, 'x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      await expectError(
        service.unblockUser(admin, 'x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('unblocks a user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      prisma.user.update.mockResolvedValue(userRow({ isBlocked: false }));
      const result = await service.unblockUser(admin, 'u2');
      expect(firstArg<{ data: unknown }>(prisma.user.update).data).toEqual({
        isBlocked: false,
      });
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('roles', () => {
    const userRowFor = (role: Role) => ({
      id: 'u2',
      email: 'rustam@example.com',
      username: 'rustam',
      role,
      isBlocked: false,
      isStudentVerified: false,
      createdAt: new Date(),
      _count: { posts: 0 },
    });

    it('promotes a user to ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      prisma.user.update.mockResolvedValue(userRowFor(Role.ADMIN));
      const result = await service.promoteUser('u2');
      expect(firstArg<{ data: unknown }>(prisma.user.update).data).toEqual({
        role: Role.ADMIN,
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('refuses to promote an admin (USER_ALREADY_ADMIN) and the super admin (CANNOT_CHANGE_SUPER_ADMIN)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a9', role: Role.ADMIN });
      await expectError(
        service.promoteUser('a9'),
        ErrorCode.USER_ALREADY_ADMIN,
        HttpStatus.CONFLICT,
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 's1',
        role: Role.SUPER_ADMIN,
      });
      await expectError(
        service.promoteUser('s1'),
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('demotes an admin to USER', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a9', role: Role.ADMIN });
      prisma.user.update.mockResolvedValue(userRowFor(Role.USER));
      const result = await service.demoteUser('a9');
      expect(firstArg<{ data: unknown }>(prisma.user.update).data).toEqual({
        role: Role.USER,
      });
      expect(result.role).toBe(Role.USER);
    });

    it('refuses to demote a user (USER_NOT_ADMIN) and the super admin (CANNOT_CHANGE_SUPER_ADMIN)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      await expectError(
        service.demoteUser('u2'),
        ErrorCode.USER_NOT_ADMIN,
        HttpStatus.CONFLICT,
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 's1',
        role: Role.SUPER_ADMIN,
      });
      await expectError(
        service.demoteUser('s1'),
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    });

    it('throws USER_NOT_FOUND when promoting or demoting an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectError(
        service.promoteUser('x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      await expectError(
        service.demoteUser('x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('the users list can filter by role: ADMIN includes the super admin', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      const base = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'desc',
      } as const;
      await service.listUsers({ ...base, role: 'ADMIN' });
      expect(
        firstArg<{ where: { role: unknown } }>(prisma.user.findMany).where.role,
      ).toEqual({ in: [Role.ADMIN, Role.SUPER_ADMIN] });
      prisma.user.findMany.mockClear();
      await service.listUsers({ ...base, role: 'USER' });
      expect(
        firstArg<{ where: { role: unknown } }>(prisma.user.findMany).where.role,
      ).toBe(Role.USER);
    });
  });

  describe('posts of admins', () => {
    it('an admin cannot remove, restore or dismiss reports on the post of another admin (FORBIDDEN_ROLE)', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'a9',
        status: PostStatus.ACTIVE,
        expiresAt: new Date(),
        author: { role: Role.ADMIN },
      });
      await expectError(
        service.removePost(admin, 'p1', {}),
        ErrorCode.FORBIDDEN_ROLE,
        HttpStatus.FORBIDDEN,
      );
      await expectError(
        service.restorePost(admin, 'p1'),
        ErrorCode.FORBIDDEN_ROLE,
        HttpStatus.FORBIDDEN,
      );
      await expectError(
        service.dismissReports(admin, 'p1'),
        ErrorCode.FORBIDDEN_ROLE,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it('an admin cannot touch the posts of the super admin (CANNOT_CHANGE_SUPER_ADMIN)', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 's1',
        status: PostStatus.ACTIVE,
        author: { role: Role.SUPER_ADMIN },
      });
      await expectError(
        service.removePost(admin, 'p1', {}),
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    });

    it('the super admin can remove the post of an admin', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'a9',
        status: PostStatus.ACTIVE,
        author: { role: Role.ADMIN },
      });
      prisma.post.findUniqueOrThrow.mockResolvedValue(postRow());
      await expect(
        service.removePost(superAdmin, 'p1', {}),
      ).resolves.toMatchObject({ status: PostStatus.REMOVED });
    });
  });

  describe('detail pages', () => {
    const detailRow = () => ({
      id: 'p1',
      title: 'Math tutor',
      description: 'Lessons',
      category: 'TUTORING',
      district: 'SINO',
      status: PostStatus.ACTIVE,
      price: 100,
      priceUnit: 'PER_HOUR',
      contactTelegram: 'aziza',
      contactPhone: null,
      removedReason: null,
      authorId: 'u2',
      createdAt: new Date(),
      expiresAt: new Date(),
      images: [{ id: 'i1', url: 'https://x/y.jpg', position: 0 }],
      reports: [
        {
          id: 'r1',
          reason: 'SPAM',
          details: 'again',
          status: ReportStatus.OPEN,
          createdAt: new Date(),
          resolvedAt: null,
          reporter: { id: 'u1', username: 'aziza' },
        },
      ],
      author: {
        id: 'u2',
        username: 'rustam',
        email: 'rustam@example.com',
        role: Role.USER,
        isBlocked: false,
        isStudentVerified: true,
        createdAt: new Date(),
        _count: { posts: 3 },
      },
    });

    it('post page: post, images, every report with the reporter id, and the author summary with counts', async () => {
      prisma.post.findUnique.mockResolvedValue(detailRow());
      prisma.report.count.mockResolvedValue(4);
      const result = await service.getPostDetail('p1');
      expect(result.images).toHaveLength(1);
      expect(result.reports[0]).toMatchObject({
        reason: 'SPAM',
        reporter: { id: 'u1', username: 'aziza' },
      });
      expect(result.author).toMatchObject({
        id: 'u2',
        email: 'rustam@example.com',
        postsCount: 3,
        reportsOnPostsCount: 4,
        isStudentVerified: true,
      });
      expect(result.author).not.toHaveProperty('passwordHash');
    });

    it('post page: POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.getPostDetail('x'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('dismiss reports: only OPEN reports become DISMISSED, then the page data is returned', async () => {
      prisma.post.findUnique
        .mockResolvedValueOnce({ id: 'p1', author: { role: Role.USER } })
        .mockResolvedValueOnce(detailRow());
      prisma.report.count.mockResolvedValue(1);
      await service.dismissReports(admin, 'p1');
      const args = firstArg<{
        where: unknown;
        data: { status: string; resolvedAt: Date };
      }>(prisma.report.updateMany);
      expect(args.where).toEqual({ postId: 'p1', status: ReportStatus.OPEN });
      expect(args.data.status).toBe(ReportStatus.DISMISSED);
      expect(args.data.resolvedAt).toBeInstanceOf(Date);
    });

    it('user page: counts and their posts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        email: 'rustam@example.com',
        username: 'rustam',
        role: Role.USER,
        isBlocked: false,
        isStudentVerified: false,
        createdAt: new Date(),
        _count: { posts: 2 },
      });
      prisma.post.findMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'T',
          category: 'OTHER',
          status: PostStatus.ACTIVE,
          createdAt: new Date(),
          _count: { reports: 1 },
        },
      ]);
      prisma.report.count.mockResolvedValue(5);
      prisma.comment.count.mockResolvedValue(7);
      prisma.post.count.mockResolvedValue(1);
      const result = await service.getUserDetail('u2');
      expect(result.counts).toEqual({
        posts: 2,
        reportsOnPosts: 5,
        comments: 7,
        removedPosts: 1,
      });
      expect(result.posts[0]).toMatchObject({ id: 'p1', openReportsCount: 1 });
      expect(result.email).toBe('rustam@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('user page: USER_NOT_FOUND for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectError(
        service.getUserDetail('x'),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
