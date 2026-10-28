import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PostStatus, ReportStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { statusWhere } from '../posts/post-status-filter';
import {
  AdminPostDetailResponseDto,
  AdminPostResponseDto,
  AdminPostsQueryDto,
  AdminReportResponseDto,
  AdminReportsQueryDto,
  AdminStatsResponseDto,
  AdminUserDetailResponseDto,
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
      author: { select: { id: true, username: true } },
    },
  },
  reporter: { select: { id: true, username: true } },
} satisfies Prisma.ReportInclude;

const POST_INCLUDE = {
  author: { select: { id: true, username: true } },
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

const POST_DETAIL_INCLUDE = {
  images: {
    orderBy: { position: 'asc' },
    select: { id: true, url: true, position: true },
  },
  reports: {
    orderBy: { createdAt: 'desc' },
    include: { reporter: { select: { id: true, username: true } } },
  },
  author: {
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isBlocked: true,
      isStudentVerified: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  },
} satisfies Prisma.PostInclude;

/** How many posts an admin sees on the user page. */
const USER_PAGE_POSTS = 50;

type PostDetailRow = Prisma.PostGetPayload<{
  include: typeof POST_DETAIL_INCLUDE;
}>;
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
      ...(query.status ? statusWhere(query.status, new Date()) : {}),
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
    admin: AuthUser,
    id: string,
    dto: RemovePostDto,
  ): Promise<AdminPostResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        author: { select: { role: true } },
      },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.assertCanTouchPostOf(admin, post.author.role);
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
  async restorePost(
    admin: AuthUser,
    id: string,
  ): Promise<AdminPostResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        author: { select: { role: true } },
      },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.assertCanTouchPostOf(admin, post.author.role);
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

  /** The admin post page: the post, every report on it and a summary of its author. */
  async getPostDetail(id: string): Promise<AdminPostDetailResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_DETAIL_INCLUDE,
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const reportsOnPostsCount = await this.prisma.report.count({
      where: { post: { authorId: post.authorId } },
    });
    return toPostDetail(post, reportsOnPostsCount);
  }

  /** Marks every OPEN report on a post as DISMISSED (the post stays). */
  async dismissReports(
    admin: AuthUser,
    id: string,
  ): Promise<AdminPostDetailResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, author: { select: { role: true } } },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.assertCanTouchPostOf(admin, post.author.role);
    await this.prisma.report.updateMany({
      where: { postId: id, status: ReportStatus.OPEN },
      data: { status: ReportStatus.DISMISSED, resolvedAt: new Date() },
    });
    return this.getPostDetail(id);
  }

  // ---------- users ----------

  async listUsers(
    query: AdminUsersQueryDto,
  ): Promise<PaginatedAdminUsersResponseDto> {
    const where: Prisma.UserWhereInput = {
      ...(query.isBlocked !== undefined ? { isBlocked: query.isBlocked } : {}),
      ...(query.role === 'USER' ? { role: Role.USER } : {}),
      ...(query.role === 'ADMIN'
        ? { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } }
        : {}),
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
    this.assertCanManageUser(admin, target);
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { isBlocked: true },
        select: USER_SELECT,
      }),
    );
  }

  async unblockUser(
    admin: AuthUser,
    id: string,
  ): Promise<AdminUserResponseDto> {
    this.assertCanManageUser(admin, await this.findUser(id));
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { isBlocked: false },
        select: USER_SELECT,
      }),
    );
  }

  async promoteUser(id: string): Promise<AdminUserResponseDto> {
    const target = await this.findUser(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    }
    if (target.role === Role.ADMIN) {
      throw new AppException(ErrorCode.USER_ALREADY_ADMIN, HttpStatus.CONFLICT);
    }
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { role: Role.ADMIN },
        select: USER_SELECT,
      }),
    );
  }

  async demoteUser(id: string): Promise<AdminUserResponseDto> {
    const target = await this.findUser(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    }
    if (target.role === Role.USER) {
      throw new AppException(ErrorCode.USER_NOT_ADMIN, HttpStatus.CONFLICT);
    }
    return toUser(
      await this.prisma.user.update({
        where: { id },
        data: { role: Role.USER },
        select: USER_SELECT,
      }),
    );
  }

  /** The admin user page: the user, some counts and their posts. */
  async getUserDetail(id: string): Promise<AdminUserDetailResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const [posts, reportsOnPosts, comments, removedPosts] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: USER_PAGE_POSTS,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          _count: {
            select: { reports: { where: { status: ReportStatus.OPEN } } },
          },
        },
      }),
      this.prisma.report.count({ where: { post: { authorId: id } } }),
      this.prisma.comment.count({ where: { authorId: id } }),
      this.prisma.post.count({
        where: { authorId: id, status: PostStatus.REMOVED },
      }),
    ]);
    return {
      ...toUser(user),
      counts: {
        posts: user._count.posts,
        reportsOnPosts,
        comments,
        removedPosts,
      },
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        category: post.category,
        status: post.status,
        createdAt: post.createdAt,
        openReportsCount: post._count.reports,
      })),
    };
  }

  // ---------- helpers ----------

  /**
   * Who may block/unblock whom: nobody may touch the super admin; only the super admin may touch an admin.
   */
  private assertCanManageUser(actor: AuthUser, target: { role: Role }): void {
    if (target.role === Role.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    }
    if (target.role === Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new AppException(ErrorCode.FORBIDDEN_ROLE, HttpStatus.FORBIDDEN);
    }
  }

  /** Same rule for the posts of an admin: only the super admin may remove, restore or dismiss them. */
  private assertCanTouchPostOf(actor: AuthUser, authorRole: Role): void {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (authorRole === Role.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
        HttpStatus.FORBIDDEN,
      );
    }
    if (authorRole === Role.ADMIN) {
      throw new AppException(ErrorCode.FORBIDDEN_ROLE, HttpStatus.FORBIDDEN);
    }
  }

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
      author: { id: row.post.author.id, username: row.post.author.username },
    },
    reporter: { id: row.reporter.id, username: row.reporter.username },
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
    author: { id: row.author.id, username: row.author.username },
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

function toPostDetail(
  row: PostDetailRow,
  reportsOnPostsCount: number,
): AdminPostDetailResponseDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    district: row.district,
    status: row.status,
    price: row.price,
    priceUnit: row.priceUnit,
    contactTelegram: row.contactTelegram,
    contactPhone: row.contactPhone,
    removedReason: row.removedReason,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    images: row.images,
    reports: row.reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      reporter: { id: report.reporter.id, username: report.reporter.username },
    })),
    author: {
      id: row.author.id,
      username: row.author.username,
      email: row.author.email,
      role: row.author.role,
      isBlocked: row.author.isBlocked,
      isStudentVerified: row.author.isStudentVerified,
      createdAt: row.author.createdAt,
      postsCount: row.author._count.posts,
      reportsOnPostsCount,
    },
  };
}
