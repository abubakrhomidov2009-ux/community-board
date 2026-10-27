import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

type NotificationRow = {
  id: string;
  type: NotificationType;
  postId: string | null;
  conversationId: string | null;
  actorUsername: string | null;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- reading (the logged-in user's own notifications) ----------

  async list(
    user: AuthUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(rows.map(toResponse), total, query.page, query.limit);
  }

  async unreadCount(user: AuthUser): Promise<UnreadCountResponseDto> {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { count };
  }

  /** Marking an already read notification is fine. Someone else's notification looks like it does not exist. */
  async markRead(user: AuthUser, id: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!notification) {
      throw new AppException(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.notification.updateMany({
      where: { id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(user: AuthUser): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ---------- creating (called by other services) ----------

  /** Someone commented on your post. Not sent when you comment on your own post. */
  async notifyNewComment(
    postAuthorId: string,
    commenter: AuthUser,
    postId: string,
  ): Promise<void> {
    if (postAuthorId === commenter.id) return;
    await this.prisma.notification.create({
      data: {
        userId: postAuthorId,
        type: NotificationType.NEW_COMMENT,
        postId,
        actorUsername: commenter.username,
      },
    });
  }

  /** An admin removed your post. */
  async notifyPostRemoved(postAuthorId: string, postId: string): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: postAuthorId,
        type: NotificationType.POST_REMOVED,
        postId,
      },
    });
  }

  /**
   * You have a new private message. Only one unread notification per conversation,
   * so a busy chat does not flood the bell. Reading the chat clears it.
   */
  async notifyNewMessage(
    recipientId: string,
    sender: AuthUser,
    conversationId: string,
  ): Promise<void> {
    const alreadyUnread = await this.prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: NotificationType.NEW_MESSAGE,
        conversationId,
        readAt: null,
      },
      select: { id: true },
    });
    if (alreadyUnread) return;
    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        type: NotificationType.NEW_MESSAGE,
        conversationId,
        actorUsername: sender.username,
      },
    });
  }
}

function toResponse(row: NotificationRow): NotificationResponseDto {
  return {
    id: row.id,
    type: row.type,
    postId: row.postId,
    conversationId: row.conversationId,
    actorUsername: row.actorUsername,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
