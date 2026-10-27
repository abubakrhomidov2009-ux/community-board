import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, NotificationType, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagesService } from './messages.service';

const user: AuthUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const messageRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u1',
  body: 'Hello',
  createdAt: new Date('2026-03-02T11:00:00Z'),
  sender: { username: 'aziza', isStudentVerified: false },
  ...overrides,
});

describe('MessagesService', () => {
  let service: MessagesService;
  const prisma = {
    user: { findUnique: jest.fn() },
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    message: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    notification: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = { notifyNewMessage: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operations: unknown[]) =>
      Promise.all(operations),
    );
    prisma.message.create.mockResolvedValue(messageRow());
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(MessagesService);
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

  const recipient = {
    id: 'u2',
    username: 'rustam',
    isStudentVerified: true,
    isBlocked: false,
  };

  describe('startConversation', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(recipient);
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'c1' });
    });

    it('creates a conversation with both people, saves the first message and notifies the recipient', async () => {
      const result = await service.startConversation(user, {
        recipientUsername: 'rustam',
        body: 'Hello',
      });

      const created = firstArg<{
        data: { participants: { create: { userId: string }[] } };
      }>(prisma.conversation.create);
      expect(created.data.participants.create.map((p) => p.userId)).toEqual([
        'u1',
        'u2',
      ]);
      expect(result).toMatchObject({
        id: 'c1',
        otherUser: { username: 'rustam', isStudentVerified: true },
        unreadCount: 0,
        lastMessage: { body: 'Hello', isMine: true },
      });
      expect(notifications.notifyNewMessage).toHaveBeenCalledWith(
        'u2',
        user,
        'c1',
      );
    });

    it('reuses the existing conversation with that person', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'c7' });
      prisma.message.create.mockResolvedValue(
        messageRow({ conversationId: 'c7' }),
      );
      const result = await service.startConversation(user, {
        recipientUsername: 'rustam',
        body: 'Again',
      });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result.id).toBe('c7');
    });

    it('throws MESSAGE_SELF when writing to yourself', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...recipient,
        id: 'u1',
        username: 'aziza',
      });
      await expectError(
        service.startConversation(user, {
          recipientUsername: 'aziza',
          body: 'Hi me',
        }),
        ErrorCode.MESSAGE_SELF,
        HttpStatus.BAD_REQUEST,
      );
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('throws USER_NOT_FOUND for an unknown or a blocked recipient', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expectError(
        service.startConversation(user, {
          recipientUsername: 'nobody',
          body: 'Hi',
        }),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      prisma.user.findUnique.mockResolvedValue({
        ...recipient,
        isBlocked: true,
      });
      await expectError(
        service.startConversation(user, {
          recipientUsername: 'rustam',
          body: 'Hi',
        }),
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('listConversations', () => {
    it('lists my conversations with the other person, the last message and my unread count', async () => {
      const lastRead = new Date('2026-03-02T10:00:00Z');
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'c1',
          lastMessageAt: new Date('2026-03-02T11:00:00Z'),
          participants: [
            {
              userId: 'u1',
              lastReadAt: lastRead,
              user: { username: 'aziza', isStudentVerified: false },
            },
            {
              userId: 'u2',
              lastReadAt: lastRead,
              user: { username: 'rustam', isStudentVerified: true },
            },
          ],
          messages: [
            messageRow({
              senderId: 'u2',
              sender: { username: 'rustam', isStudentVerified: true },
            }),
          ],
        },
      ]);
      prisma.conversation.count.mockResolvedValue(1);
      prisma.message.count.mockResolvedValue(2);

      const result = await service.listConversations(user, {
        page: 1,
        limit: 20,
      });

      expect(result.items[0]).toMatchObject({
        id: 'c1',
        otherUser: { username: 'rustam' },
        unreadCount: 2,
        lastMessage: { body: 'Hello', isMine: false },
      });
      const list = firstArg<{ where: unknown; orderBy: unknown[] }>(
        prisma.conversation.findMany,
      );
      expect(list.where).toEqual({ participants: { some: { userId: 'u1' } } });
      expect(list.orderBy[0]).toEqual({ lastMessageAt: 'desc' });
      const unread = firstArg<{
        where: { senderId: unknown; createdAt: unknown };
      }>(prisma.message.count);
      expect(unread.where.senderId).toEqual({ not: 'u1' });
      expect(unread.where.createdAt).toEqual({ gt: lastRead });
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('listMessages', () => {
    it('throws CONVERSATION_NOT_FOUND for someone who is not in the conversation', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expectError(
        service.listMessages(user, 'c1', { limit: 50 }),
        ErrorCode.CONVERSATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('returns the newest messages oldest first when no "after" is sent', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        userId: 'u1',
      });
      prisma.message.findMany.mockResolvedValue([
        messageRow({ id: 'm3', body: 'third' }),
        messageRow({ id: 'm2', body: 'second' }),
        messageRow({ id: 'm1', body: 'first' }),
      ]);
      const result = await service.listMessages(user, 'c1', { limit: 3 });
      expect(result.map((m) => m.body)).toEqual(['first', 'second', 'third']);
      expect(firstArg<{ take: number }>(prisma.message.findMany).take).toBe(3);
    });

    it('returns only newer messages when "after" is sent (polling)', async () => {
      const after = new Date('2026-03-02T11:00:00Z');
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        userId: 'u1',
      });
      prisma.message.findMany.mockResolvedValue([
        messageRow({ senderId: 'u2' }),
      ]);
      const result = await service.listMessages(user, 'c1', {
        after,
        limit: 50,
      });
      const args = firstArg<{
        where: { createdAt: unknown };
        orderBy: unknown[];
      }>(prisma.message.findMany);
      expect(args.where.createdAt).toEqual({ gt: after });
      expect(args.orderBy[0]).toEqual({ createdAt: 'asc' });
      expect(result[0].isMine).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('throws CONVERSATION_NOT_FOUND for someone who is not in the conversation', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expectError(
        service.sendMessage(user, 'c1', { body: 'Hi' }),
        ErrorCode.CONVERSATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('saves the message as mine and notifies the other person', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        userId: 'u1',
      });
      prisma.conversationParticipant.findFirst.mockResolvedValue({
        userId: 'u2',
      });
      const result = await service.sendMessage(user, 'c1', { body: 'Hello' });
      expect(result).toMatchObject({ body: 'Hello', isMine: true });
      expect(result).not.toHaveProperty('senderId');
      expect(notifications.notifyNewMessage).toHaveBeenCalledWith(
        'u2',
        user,
        'c1',
      );
    });

    it('moves the conversation to the top and counts the message as read by the sender', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        userId: 'u1',
      });
      prisma.conversationParticipant.findFirst.mockResolvedValue({
        userId: 'u2',
      });
      await service.sendMessage(user, 'c1', { body: 'Hello' });
      const conversation = firstArg<{
        where: unknown;
        data: { lastMessageAt: Date };
      }>(prisma.conversation.update);
      expect(conversation.where).toEqual({ id: 'c1' });
      expect(conversation.data.lastMessageAt).toBeInstanceOf(Date);
      const participant = firstArg<{ where: unknown }>(
        prisma.conversationParticipant.update,
      );
      expect(participant.where).toEqual({
        conversationId_userId: { conversationId: 'c1', userId: 'u1' },
      });
    });
  });

  describe('markRead', () => {
    it('throws CONVERSATION_NOT_FOUND for someone who is not in the conversation', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expectError(
        service.markRead(user, 'c1'),
        ErrorCode.CONVERSATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('sets my lastReadAt and clears the "new message" notifications of this chat', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        userId: 'u1',
      });
      await service.markRead(user, 'c1');
      const participant = firstArg<{ data: { lastReadAt: Date } }>(
        prisma.conversationParticipant.update,
      );
      expect(participant.data.lastReadAt).toBeInstanceOf(Date);
      const notification = firstArg<{ where: unknown }>(
        prisma.notification.updateMany,
      );
      expect(notification.where).toEqual({
        userId: 'u1',
        conversationId: 'c1',
        type: NotificationType.NEW_MESSAGE,
        readAt: null,
      });
    });
  });
});
