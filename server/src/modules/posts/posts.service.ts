import { HttpStatus, Injectable } from '@nestjs/common';
import { Category, Prisma, PostStatus, PriceUnit, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  MyPostsQueryDto,
  PostCountsQueryDto,
  PostFiltersDto,
  PostMapQueryDto,
  PostSort,
} from './dto/post-query.dto';
import {
  MapPinResponseDto,
  PaginatedPostsResponseDto,
  POST_INCLUDE,
  PostCountsResponseDto,
  PostResponseDto,
  PostWithRelations,
} from './dto/post-response.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  addDays,
  EXPIRE_SWEEP_INTERVAL_MS,
  POST_LIFETIME_DAYS,
  PRICE_CATEGORIES,
  PUBLIC_STATUSES,
} from './posts.constants';

const MAP_PIN_LIMIT = 300;

/** The values of a post that have rules attached (contact, price, coordinates). */
interface RuleFields {
  category: Category;
  price: number | null;
  priceUnit: PriceUnit | null;
  contactTelegram: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
}

@Injectable()
export class PostsService {
  private lastSweep = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ---------- reading ----------

  async list(
    query: ListPostsQueryDto,
    viewer?: AuthUser,
  ): Promise<PaginatedPostsResponseDto> {
    await this.expireOverdue();
    const now = new Date();
    const where = this.publicWhere(query, now, query.category);
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: this.orderBy(query.sort),
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.post.count({ where }),
    ]);
    const items = await this.toResponses(rows, viewer, now);
    return paginate(items, total, query.page, query.limit);
  }

  async counts(query: PostCountsQueryDto): Promise<PostCountsResponseDto> {
    await this.expireOverdue();
    const grouped = await this.prisma.post.groupBy({
      by: ['category'],
      where: this.publicWhere(query, new Date()),
      _count: { _all: true },
    });
    const counts: PostCountsResponseDto = {
      ALL: 0,
      LOST_FOUND: 0,
      TUTORING: 0,
      RENTALS: 0,
      OTHER: 0,
    };
    for (const row of grouped) {
      counts[row.category] = row._count._all;
      counts.ALL += row._count._all;
    }
    return counts;
  }

  async mapPins(query: PostMapQueryDto): Promise<MapPinResponseDto[]> {
    await this.expireOverdue();
    const where: Prisma.PostWhereInput = {
      ...this.publicWhere(query, new Date(), query.category),
      latitude: { not: null },
      longitude: { not: null },
    };
    const rows = await this.prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        price: true,
        priceUnit: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAP_PIN_LIMIT,
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      price: row.price,
      priceUnit: row.priceUnit,
    }));
  }

  async listMine(
    user: AuthUser,
    query: MyPostsQueryDto,
  ): Promise<PaginatedPostsResponseDto> {
    await this.expireOverdue();
    const where: Prisma.PostWhereInput = {
      authorId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.post.count({ where }),
    ]);
    const items = await this.toResponses(rows, user, new Date());
    return paginate(items, total, query.page, query.limit);
  }

  async getById(id: string, viewer?: AuthUser): Promise<PostResponseDto> {
    await this.expireOverdue();
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    // Removed posts are only visible to their author and to admins.
    const canSeeRemoved =
      viewer && (viewer.id === post.authorId || viewer.role === Role.ADMIN);
    if (post.status === PostStatus.REMOVED && !canSeeRemoved) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const [response] = await this.toResponses([post], viewer, new Date());
    return response;
  }

  // ---------- writing ----------

  async create(user: AuthUser, dto: CreatePostDto): Promise<PostResponseDto> {
    const fields = this.checkRules({
      category: dto.category,
      price: dto.price ?? null,
      priceUnit: dto.priceUnit ?? null,
      contactTelegram: dto.contactTelegram ?? null,
      contactPhone: dto.contactPhone ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        district: dto.district,
        ...fields,
        expiresAt: addDays(new Date(), POST_LIFETIME_DAYS),
        authorId: user.id,
      },
      include: POST_INCLUDE,
    });
    return PostResponseDto.from(post, false);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    const existing = await this.findOwned(user, id);
    if (existing.status === PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_ACTIVE, HttpStatus.CONFLICT);
    }

    // Values that were not sent keep their current value.
    const fields = this.checkRules({
      category: dto.category ?? existing.category,
      price: dto.price !== undefined ? dto.price : existing.price,
      priceUnit:
        dto.priceUnit !== undefined ? dto.priceUnit : existing.priceUnit,
      contactTelegram:
        dto.contactTelegram !== undefined
          ? dto.contactTelegram
          : existing.contactTelegram,
      contactPhone:
        dto.contactPhone !== undefined
          ? dto.contactPhone
          : existing.contactPhone,
      latitude: dto.latitude !== undefined ? dto.latitude : existing.latitude,
      longitude:
        dto.longitude !== undefined ? dto.longitude : existing.longitude,
    });

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.district !== undefined ? { district: dto.district } : {}),
        ...fields,
      },
      include: POST_INCLUDE,
    });
    return PostResponseDto.from(post, await this.isFavorite(user, id));
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new AppException(ErrorCode.POST_NOT_OWNER, HttpStatus.FORBIDDEN);
    }
    // Day 4: images are deleted from Cloudinary here before the row is removed.
    await this.prisma.post.delete({ where: { id } });
  }

  async resolve(user: AuthUser, id: string): Promise<PostResponseDto> {
    const existing = await this.findOwned(user, id);
    if (
      existing.status !== PostStatus.ACTIVE ||
      existing.expiresAt <= new Date()
    ) {
      throw new AppException(ErrorCode.POST_NOT_ACTIVE, HttpStatus.CONFLICT);
    }
    const post = await this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.RESOLVED },
      include: POST_INCLUDE,
    });
    return PostResponseDto.from(post, await this.isFavorite(user, id));
  }

  /**
   * Marks ACTIVE posts past their expiry date as EXPIRED.
   * Runs on reads (at most once a minute) because the free server can sleep and miss the daily job.
   */
  async expireOverdue(force = false): Promise<number> {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastSweep < EXPIRE_SWEEP_INTERVAL_MS) return 0;
    this.lastSweep = nowMs;
    const result = await this.prisma.post.updateMany({
      where: { status: PostStatus.ACTIVE, expiresAt: { lte: new Date(nowMs) } },
      data: { status: PostStatus.EXPIRED },
    });
    return result.count;
  }

  // ---------- helpers ----------

  /** Loads a post and checks that the user is its author. 404 first, then 403. */
  private async findOwned(user: AuthUser, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.authorId !== user.id) {
      throw new AppException(ErrorCode.POST_NOT_OWNER, HttpStatus.FORBIDDEN);
    }
    return post;
  }

  /** Business rules for contact, price and coordinates. Returns the cleaned values to save. */
  private checkRules(values: RuleFields): RuleFields {
    if (!values.contactTelegram && !values.contactPhone) {
      throw new AppException(
        ErrorCode.CONTACT_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (values.price !== null && !PRICE_CATEGORIES.includes(values.category)) {
      throw new AppException(
        ErrorCode.PRICE_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (values.price !== null && values.priceUnit === null) {
      throw new AppException(
        ErrorCode.PRICE_UNIT_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    if ((values.latitude === null) !== (values.longitude === null)) {
      const missing = values.latitude === null ? 'latitude' : 'longitude';
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Send latitude and longitude together',
        [{ field: missing, code: 'coordinatesPair' }],
      );
    }
    return {
      ...values,
      // A unit without a price makes no sense.
      priceUnit: values.price === null ? null : values.priceUnit,
    };
  }

  /** The "visible to everyone" filter plus the user's search filters. */
  private publicWhere(
    filters: PostFiltersDto,
    now: Date,
    category?: Category,
  ): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput = {
      status: { in: PUBLIC_STATUSES },
      expiresAt: { gt: now },
    };
    if (category) where.category = category;
    if (filters.district) where.district = filters.district;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private orderBy(sort: PostSort): Prisma.PostOrderByWithRelationInput[] {
    switch (sort) {
      case PostSort.OLDEST:
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case PostSort.PRICE_ASC:
        return [
          { price: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ];
      case PostSort.PRICE_DESC:
        return [
          { price: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ];
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  private async toResponses(
    posts: PostWithRelations[],
    viewer: AuthUser | undefined,
    now: Date,
  ) {
    const favoriteIds = await this.favoriteIds(
      viewer,
      posts.map((post) => post.id),
    );
    return posts.map((post) =>
      PostResponseDto.from(post, favoriteIds.has(post.id), now),
    );
  }

  /** Which of these posts did the viewer save? Empty for guests. */
  private async favoriteIds(
    viewer: AuthUser | undefined,
    postIds: string[],
  ): Promise<Set<string>> {
    if (!viewer || postIds.length === 0) return new Set();
    const rows = await this.prisma.favorite.findMany({
      where: { userId: viewer.id, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(rows.map((row) => row.postId));
  }

  private async isFavorite(viewer: AuthUser, postId: string): Promise<boolean> {
    return (await this.favoriteIds(viewer, [postId])).has(postId);
  }
}
