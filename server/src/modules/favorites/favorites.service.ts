import { HttpStatus, Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaginatedPostsResponseDto,
  POST_INCLUDE,
  PostResponseDto,
} from '../posts/dto/post-response.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Saved posts, newest save first. Removed posts are hidden; expired ones stay (marked EXPIRED). */
  async list(
    user: AuthUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedPostsResponseDto> {
    const where = {
      userId: user.id,
      post: { status: { not: PostStatus.REMOVED } },
    };
    const [rows, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        include: { post: { include: POST_INCLUDE } },
        orderBy: [{ createdAt: 'desc' }, { postId: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.favorite.count({ where }),
    ]);
    const now = new Date();
    const items = rows.map((row) => PostResponseDto.from(row.post, true, now));
    return paginate(items, total, query.page, query.limit);
  }

  /** Saving twice is fine: the answer is the same. */
  async add(user: AuthUser, postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { status: true },
    });
    if (!post || post.status === PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    await this.prisma.favorite.upsert({
      where: { userId_postId: { userId: user.id, postId } },
      update: {},
      create: { userId: user.id, postId },
    });
  }

  /** Removing something that is not saved is fine too. */
  async remove(user: AuthUser, postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    await this.prisma.favorite.deleteMany({
      where: { userId: user.id, postId },
    });
  }
}
