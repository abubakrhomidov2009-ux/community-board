import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { pageArgs, paginate } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ConversationResponseDto,
  CreateConversationDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  MessageResponseDto,
  PaginatedConversationsResponseDto,
  SendMessageDto,
} from './dto/message.dto';

const USER_SELECT = { username: true, isStudentVerified: true } as const;
const MESSAGE_INCLUDE = {
  sender: { select: USER_SELECT },
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- conversations ----------

  /** My conversations, newest activity first, with the last message and my unread count. */
  async listConversations(
    user: AuthUser,
    query: ListConversationsQueryDto,
  ): Promise<PaginatedConversationsResponseDto> {
    const where: Prisma.ConversationWhereInput = {
      participants: { some: { userId: user.id } },
    };
    const [rows, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          participants: { include: { user: { select: USER_SELECT } } },
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            include: MESSAGE_INCLUDE,
          },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (conversation) => {
        const me = conversation.participants.find((p) => p.userId === user.id);
        const other = conversation.participants.find(
          (p) => p.userId !== user.id,
        );
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: user.id },
            createdAt: { gt: me?.lastReadAt ?? new Date(0) },
          },
        });
        return {
          id: conversation.id,
          otherUser: other?.user ?? {
            username: 'deleted',
            isStudentVerified: false,
          },
          lastMessage: conversation.messages[0]
            ? toMessage(conversation.messages[0], user.id)
            : null,
          unreadCount,
          lastMessageAt: conversation.lastMessageAt,
        } satisfies ConversationResponseDto;
      }),
    );
    return paginate(items, total, query.page, query.limit);
  }

  /** Starts a conversation (or reuses the existing one with that person) and sends the first message. */
  async startConversation(
    user: AuthUser,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const recipient = await this.prisma.user.findUnique({
      where: { username: dto.recipientUsername },
      select: {
        id: true,
        username: true,
        isStudentVerified: true,
        isBlocked: true,
      },
    });
    // A blocked user looks like a user that does not exist.
    if (!recipient || recipient.isBlocked) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (recipient.id === user.id) {
      throw new AppException(ErrorCode.MESSAGE_SELF, HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: recipient.id } } },
        ],
      },
      select: { id: true },
    });
    const conversationId =
      existing?.id ??
      (
        await this.prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: user.id }, { userId: recipient.id }],
            },
          },
          select: { id: true },
        })
      ).id;

    const message = await this.saveMessage(user.id, conversationId, dto.body);
    await this.notifications.notifyNewMessage(
      recipient.id,
      user,
      conversationId,
    );
    return {
      id: conversationId,
      otherUser: {
        username: recipient.username,
        isStudentVerified: recipient.isStudentVerified,
      },
      lastMessage: toMessage(message, user.id),
      unreadCount: 0,
      lastMessageAt: message.createdAt,
    };
  }

  // ---------- messages ----------

  /**
   * Messages of one conversation, oldest first.
   * Without `after`: the newest `limit` messages. With `after`: only newer ones (used by polling).
   */
  async listMessages(
    user: AuthUser,
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    await this.requireParticipant(user.id, conversationId);

    if (query.after) {
      const rows = await this.prisma.message.findMany({
        where: { conversationId, createdAt: { gt: query.after } },
        include: MESSAGE_INCLUDE,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: query.limit,
      });
      return rows.map((row) => toMessage(row, user.id));
    }
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      include: MESSAGE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
    });
    return rows.reverse().map((row) => toMessage(row, user.id));
  }

  async sendMessage(
    user: AuthUser,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    await this.requireParticipant(user.id, conversationId);
    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: user.id } },
      select: { userId: true },
    });
    const message = await this.saveMessage(user.id, conversationId, dto.body);
    if (other) {
      await this.notifications.notifyNewMessage(
        other.userId,
        user,
        conversationId,
      );
    }
    return toMessage(message, user.id);
  }

  /** I have read everything up to now. Also marks the "new message" notifications of this chat as read. */
  async markRead(user: AuthUser, conversationId: string): Promise<void> {
    await this.requireParticipant(user.id, conversationId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: user.id } },
        data: { lastReadAt: now },
      }),
      this.prisma.notification.updateMany({
        where: {
          userId: user.id,
          conversationId,
          type: NotificationType.NEW_MESSAGE,
          readAt: null,
        },
        data: { readAt: now },
      }),
    ]);
  }

  // ---------- helpers ----------

  /** Only the two people in a conversation can see it. Everyone else gets 404, as if it did not exist. */
  private async requireParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return participant;
  }

  /** Saves the message, moves the conversation to the top, and counts it as read by the sender. */
  private async saveMessage(
    senderId: string,
    conversationId: string,
    body: string,
  ): Promise<MessageRow> {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, body },
        include: MESSAGE_INCLUDE,
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: senderId } },
        data: { lastReadAt: new Date() },
      }),
    ]);
    return message;
  }
}

function toMessage(row: MessageRow, viewerId: string): MessageResponseDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    createdAt: row.createdAt,
    sender: {
      username: row.sender.username,
      isStudentVerified: row.sender.isStudentVerified,
    },
    isMine: row.senderId === viewerId,
  };
}
