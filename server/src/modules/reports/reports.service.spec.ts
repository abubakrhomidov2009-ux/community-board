import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  Locale,
  Prisma,
  PostStatus,
  ReportReason,
  ReportStatus,
  Role,
} from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from './reports.service';

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

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    post: { findUnique: jest.fn() },
    report: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
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

  it('creates a report for a post by another user', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'u2',
      status: PostStatus.ACTIVE,
    });
    prisma.report.create.mockResolvedValue({
      id: 'r1',
      postId: 'p1',
      reporterId: 'u1',
      reason: ReportReason.SPAM,
      details: null,
      status: ReportStatus.OPEN,
      createdAt: new Date(),
    });
    const result = await service.create(user, 'p1', {
      reason: ReportReason.SPAM,
    });
    expect(result).toMatchObject({ id: 'r1', status: ReportStatus.OPEN });
    expect(result).not.toHaveProperty('reporterId');
  });

  it('throws POST_NOT_FOUND for an unknown or removed post', async () => {
    prisma.post.findUnique.mockResolvedValue(null);
    await expectError(
      service.create(user, 'x', { reason: ReportReason.SPAM }),
      ErrorCode.POST_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    prisma.post.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'u2',
      status: PostStatus.REMOVED,
    });
    await expectError(
      service.create(user, 'p1', { reason: ReportReason.SPAM }),
      ErrorCode.POST_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  });

  it('throws REPORT_OWN_POST when reporting my own post', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'u1',
      status: PostStatus.ACTIVE,
    });
    await expectError(
      service.create(user, 'p1', { reason: ReportReason.SPAM }),
      ErrorCode.REPORT_OWN_POST,
      HttpStatus.BAD_REQUEST,
    );
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('throws REPORT_ALREADY_EXISTS when the unique key is hit', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'u2',
      status: PostStatus.ACTIVE,
    });
    prisma.report.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expectError(
      service.create(user, 'p1', { reason: ReportReason.SCAM }),
      ErrorCode.REPORT_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
    );
  });
});
