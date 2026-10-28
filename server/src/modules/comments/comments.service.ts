import { HttpStatus, Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { isAdminRole } from '../../common/utils/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CommentResponseDto,
  CreateCommentDto,
  PaginatedCommentsResponseDto,
} from './dto/comment.dto';

const COMMENT_INCLUDE = {
  author: { select: { username: true, isStudentVerified: true } },
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    postId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    await this.findVisiblePost(postId);
    const where = { postId };
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: COMMENT_INCLUDE,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.comment.count({ where }),
    ]);
    return paginate(rows.map(toResponse), total, query.page, query.limit);
  }

  async create(
    user: AuthUser,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const post = await this.findVisiblePost(postId);
    // Comments are closed on resolved, expired and removed posts.
    if (post.status !== PostStatus.ACTIVE || post.expiresAt <= new Date()) {
      throw new AppException(ErrorCode.POST_NOT_ACTIVE, HttpStatus.CONFLICT);
    }
    const comment = await this.prisma.comment.create({
      data: { body: dto.body, postId, authorId: user.id },
      include: COMMENT_INCLUDE,
    });
    await this.notifications.notifyNewComment(post.authorId, user, postId);
    return toResponse(comment);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!comment) {
      throw new AppException(ErrorCode.COMMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (comment.authorId !== user.id && !isAdminRole(user.role)) {
      throw new AppException(ErrorCode.COMMENT_NOT_OWNER, HttpStatus.FORBIDDEN);
    }
    await this.prisma.comment.delete({ where: { id } });
  }

  /** A post that exists and is not removed. */
  private async findVisiblePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, expiresAt: true, authorId: true },
    });
    if (!post || post.status === PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return post;
  }
}

function toResponse(comment: {
  id: string;
  body: string;
  postId: string;
  createdAt: Date;
  author: { username: string; isStudentVerified: boolean };
}): CommentResponseDto {
  return {
    id: comment.id,
    body: comment.body,
    postId: comment.postId,
    createdAt: comment.createdAt,
    author: {
      username: comment.author.username,
      isStudentVerified: comment.author.isStudentVerified,
    },
  };
}
