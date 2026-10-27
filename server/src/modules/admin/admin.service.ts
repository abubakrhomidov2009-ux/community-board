import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PostStatus, ReportStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AdminPostResponseDto,
  AdminPostsQueryDto,
  AdminReportResponseDto,
  AdminReportsQueryDto,
  AdminStatsResponseDto,
  AdminUserResponseDto,
  AdminUsersQueryDto,
  PaginatedAdminPostsResponseDto,
  PaginatedAdminReportsResponseDto,
  PaginatedAdminUsersResponseDto,
  RemovePostDto,
  UpdateReportDto,
} from './dto/admin.dto';

const REPORT_INCLUDE = {
  post: {
    select: {
      id: true,
      title: true,
      status: true,
      author: { select: { username: true } },
    },
  },
  reporter: { select: { username: true } },
} satisfies Prisma.ReportInclude;

const POST_INCLUDE = {
  author: { select: { username: true } },
  _count: { select: { reports: { where: { status: ReportStatus.OPEN } } } },
} satisfies Prisma.PostInclude;

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  isBlocked: true,
  isStudentVerified: true,
  createdAt: true,
  _count: { select: { posts: true } },
} satisfies Prisma.UserSelect;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;
type PostRow = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;
type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

/** All methods here are only reachable by admins (RolesGuard on the controller). */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- stats ----------

  async stats(): Promise<AdminStatsResponseDto> {
    const [users, posts, activePosts, reportsOpen, blockedUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.post.count(),
        this.prisma.post.count({
          where: { status: PostStatus.ACTIVE, expiresAt: { gt: new Date() } },
        }),
        this.prisma.report.count({ where: { status: ReportStatus.OPEN } }),
        this.prisma.user.count({ where: { isBlocked: true } }),
      ]);
    return { users, posts, activePosts, reportsOpen, blockedUsers };
  }

  // ---------- reports ----------

  async listReports(
    query: AdminReportsQueryDto,
  ): Promise<PaginatedAdminReportsResponseDto> {
    const where: Prisma.ReportWhereInput = query.status
      ? { status: query.status }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: REPORT_INCLUDE,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.report.count({ where }),
    ]);
    return paginate(rows.map(toReport), total, query.page, query.limit);
  }

  async updateReport(
    id: string,
    dto: UpdateReportDto,
  ): Promise<AdminReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!report) {
      throw new AppException(ErrorCode.REPORT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const updated = await this.prisma.report.update({
      where: { id },
      data: { status: dto.status, resolvedAt: new Date() },
      include: REPORT_INCLUDE,
    });
    return toReport(updated);
  }

  // ---------- posts ----------

  async listPosts(
    query: AdminPostsQueryDto,
  ): Promise<PaginatedAdminPostsResponseDto> {
    const where: Prisma.PostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(rows.map(toPost), total, query.page, query.limit);
  }

  /** Removes a post from public view, closes its open reports and tells the author. */
  async removePost(
    id: string,
    dto: RemovePostDto,
  ): Promise<AdminPostResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.status === PostStatus.REMOVED) {
      return toPost(await this.loadPost(id));
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id },
        data: { status: PostStatus.REMOVED, removedReason: dto.reason || null },
      }),
      this.prisma.report.updateMany({
        where: { postId: id, status: ReportStatus.OPEN },
        data: { status: ReportStatus.RESOLVED, resolvedAt: now },
      }),
    ]);
    await this.notifications.notifyPostRemoved(post.authorId, id);
    return toPost(await this.loadPost(id));
  }

  /** Brings a removed post back. A post that is past its date comes back as EXPIRED (its author can renew it). */
  async restorePost(id: string): Promise<AdminPostResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, status: true, expiresAt: true },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.status !== PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_ACTIVE, HttpStatus.CONFLICT);
    }
    await this.prisma.post.update({
      where: { id },
      data: {
        status:
          post.expiresAt > new Date() ? PostStatus.ACTIVE : PostStatus.EXPIRED,
        removedReason: null,
      },
    });
    return toPost(await this.loadPost(id));
  }

  // ---------- users ----------

  async listUsers(
    query: AdminUsersQueryDto,
  ): Promise<PaginatedAdminUsersResponseDto> {
    const where: Prisma.UserWhereInput = {
      ...(query.isBlocked !== undefined ? { isBlocked: query.isBlocked } : {}),
      ...(query.q
        ? {
            OR: [
              { username: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(toUser), total, query.page, query.limit);
  }

  async blockUser(admin: AuthUser, id: string): Promise<AdminUserResponseDto> {
    const target = await this.findUser(id);
    // Admins cannot lock each other (or themselves) out.
    if (target.role === Role.ADMIN || target.id === admin.id) {
      throw new AppException(
        ErrorCode.CANNOT_BLOCK_ADMIN,
        HttpStatus.BAD_REQUEST,
      );
    }
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { isBlocked: true },
        select: USER_SELECT,
      }),
    );
  }

  async unblockUser(id: string): Promise<AdminUserResponseDto> {
    await this.findUser(id);
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { isBlocked: false },
        select: USER_SELECT,
      }),
    );
  }

  // ---------- helpers ----------

  private async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private loadPost(id: string) {
    return this.prisma.post.findUniqueOrThrow({
      where: { id },
      include: POST_INCLUDE,
    });
  }
}

function toReport(row: ReportRow): AdminReportResponseDto {
  return {
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    post: {
      id: row.post.id,
      title: row.post.title,
      status: row.post.status,
      author: { username: row.post.author.username },
    },
    reporter: { username: row.reporter.username },
  };
}

function toPost(row: PostRow): AdminPostResponseDto {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    district: row.district,
    status: row.status,
    removedReason: row.removedReason,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    author: { username: row.author.username },
    openReportsCount: row._count.reports,
  };
}

function toUser(row: UserRow): AdminUserResponseDto {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    isBlocked: row.isBlocked,
    isStudentVerified: row.isStudentVerified,
    createdAt: row.createdAt,
    postsCount: row._count.posts,
  };
}
