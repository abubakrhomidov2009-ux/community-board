import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  guestClient,
  resetDatabase,
  TestContext,
} from './helpers';

interface Message {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
  sender: { username: string };
}
interface Conversation {
  id: string;
  otherUser: { username: string };
  lastMessage: Message | null;
  unreadCount: number;
}
interface Page<T> {
  items: T[];
  total: number;
}

describe('Private messages (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('two people chat: unread counts, polling, notifications, read', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const rustam = await createUser(ctx.prisma, {
      username: 'rustam',
      isStudentVerified: true,
    });
    const azizaClient = clientWithToken(ctx.app, aziza.id);
    const rustamClient = clientWithToken(ctx.app, rustam.id);

    // aziza writes the first message
    const started = await azizaClient
      .post('/api/conversations')
      .send({
        recipientUsername: 'Rustam',
        body: 'Hi! Is the room still free?',
      })
      .expect(201);
    const conversation = bodyOf<Conversation>(started);
    expect(conversation).toMatchObject({
      otherUser: { username: 'rustam', isStudentVerified: true },
      unreadCount: 0,
      lastMessage: { body: 'Hi! Is the room still free?', isMine: true },
    });

    // rustam sees one unread conversation and one notification
    const rustamList = bodyOf<Page<Conversation>>(
      await rustamClient.get('/api/conversations').expect(200),
    );
    expect(rustamList.total).toBe(1);
    expect(rustamList.items[0]).toMatchObject({
      id: conversation.id,
      otherUser: { username: 'aziza' },
      unreadCount: 1,
    });
    expect(rustamList.items[0].lastMessage).toMatchObject({
      isMine: false,
      sender: { username: 'aziza' },
    });
    await rustamClient
      .get('/api/notifications/unread-count')
      .expect(200)
      .expect({ count: 1 });
    const notification = bodyOf<
      Page<{ type: string; conversationId: string; actorUsername: string }>
    >(await rustamClient.get('/api/notifications').expect(200)).items[0];
    expect(notification).toMatchObject({
      type: 'NEW_MESSAGE',
      conversationId: conversation.id,
      actorUsername: 'aziza',
    });

    // aziza has nothing unread (her own message)
    expect(
      bodyOf<Page<Conversation>>(
        await azizaClient.get('/api/conversations').expect(200),
      ).items[0].unreadCount,
    ).toBe(0);

    // a second message in the same chat: more unread, but still ONE notification
    await azizaClient
      .post(`/api/conversations/${conversation.id}/messages`)
      .send({ body: 'I can come tomorrow.' })
      .expect(201);
    expect(
      bodyOf<Page<Conversation>>(
        await rustamClient.get('/api/conversations').expect(200),
      ).items[0].unreadCount,
    ).toBe(2);
    await rustamClient
      .get('/api/notifications/unread-count')
      .expect(200)
      .expect({ count: 1 });

    // rustam reads the chat: oldest first
    const messages = bodyOf<Message[]>(
      await rustamClient
        .get(`/api/conversations/${conversation.id}/messages`)
        .expect(200),
    );
    expect(messages.map((m) => m.body)).toEqual([
      'Hi! Is the room still free?',
      'I can come tomorrow.',
    ]);
    expect(messages.map((m) => m.isMine)).toEqual([false, false]);

    // rustam answers; polling with "after" returns only newer messages
    const lastSeen = messages[messages.length - 1].createdAt;
    const answer = await rustamClient
      .post(`/api/conversations/${conversation.id}/messages`)
      .send({ body: 'Yes, come at 6.' })
      .expect(201);
    expect(bodyOf<Message>(answer)).toMatchObject({
      isMine: true,
      body: 'Yes, come at 6.',
    });
    const polled = bodyOf<Message[]>(
      await azizaClient
        .get(
          `/api/conversations/${conversation.id}/messages?after=${encodeURIComponent(lastSeen)}`,
        )
        .expect(200),
    );
    expect(polled.map((m) => m.body)).toEqual(['Yes, come at 6.']);
    expect(polled[0].isMine).toBe(false);
    const nothingNew = bodyOf<Message[]>(
      await azizaClient
        .get(
          `/api/conversations/${conversation.id}/messages?after=${encodeURIComponent(polled[0].createdAt)}`,
        )
        .expect(200),
    );
    expect(nothingNew).toEqual([]);

    // reading clears the unread count and the "new message" notification
    await rustamClient
      .post(`/api/conversations/${conversation.id}/read`)
      .expect(204);
    expect(
      bodyOf<Page<Conversation>>(
        await rustamClient.get('/api/conversations').expect(200),
      ).items[0].unreadCount,
    ).toBe(0);
    await rustamClient
      .get('/api/notifications/unread-count')
      .expect(200)
      .expect({ count: 0 });

    // aziza now has 1 unread (the answer) and a notification again
    expect(
      bodyOf<Page<Conversation>>(
        await azizaClient.get('/api/conversations').expect(200),
      ).items[0].unreadCount,
    ).toBe(1);
    await azizaClient
      .get('/api/notifications/unread-count')
      .expect(200)
      .expect({ count: 1 });
  });

  it('writing again to the same person reuses the conversation; the newest chat is on top', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    await createUser(ctx.prisma, { username: 'rustam' });
    await createUser(ctx.prisma, { username: 'madina' });
    const client = clientWithToken(ctx.app, aziza.id);

    const first = bodyOf<Conversation>(
      await client
        .post('/api/conversations')
        .send({ recipientUsername: 'rustam', body: 'One' })
        .expect(201),
    );
    const second = bodyOf<Conversation>(
      await client
        .post('/api/conversations')
        .send({ recipientUsername: 'madina', body: 'Two' })
        .expect(201),
    );
    const again = bodyOf<Conversation>(
      await client
        .post('/api/conversations')
        .send({ recipientUsername: 'rustam', body: 'Three' })
        .expect(201),
    );
    expect(again.id).toBe(first.id);
    expect(second.id).not.toBe(first.id);

    const list = bodyOf<Page<Conversation>>(
      await client.get('/api/conversations').expect(200),
    );
    expect(list.total).toBe(2);
    expect(list.items.map((c) => c.otherUser.username)).toEqual([
      'rustam',
      'madina',
    ]);
    expect(list.items[0].lastMessage?.body).toBe('Three');
  });

  it('only the two people can see a conversation', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    await createUser(ctx.prisma, { username: 'rustam' });
    const madina = await createUser(ctx.prisma, { username: 'madina' });
    const conversation = bodyOf<Conversation>(
      await clientWithToken(ctx.app, aziza.id)
        .post('/api/conversations')
        .send({ recipientUsername: 'rustam', body: 'Private' })
        .expect(201),
    );
    const stranger = clientWithToken(ctx.app, madina.id);

    for (const response of [
      await stranger.get(`/api/conversations/${conversation.id}/messages`),
      await stranger
        .post(`/api/conversations/${conversation.id}/messages`)
        .send({ body: 'I am listening' }),
      await stranger.post(`/api/conversations/${conversation.id}/read`),
    ]) {
      expect(response.status).toBe(404);
      expect(bodyOf(response)).toMatchObject({
        errorCode: 'CONVERSATION_NOT_FOUND',
      });
    }
    expect(
      bodyOf<Page<Conversation>>(
        await stranger.get('/api/conversations').expect(200),
      ).total,
    ).toBe(0);
    await stranger.get('/api/conversations/unknown/messages').expect(404);

    // guests are refused
    await guestClient(ctx.app).get('/api/conversations').expect(401);
    await guestClient(ctx.app)
      .post('/api/conversations')
      .send({ recipientUsername: 'rustam', body: 'Hi' })
      .expect(401);
  });

  it('message rules: not to yourself, to unknown users, length', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    await createUser(ctx.prisma, { username: 'rustam' });
    const client = clientWithToken(ctx.app, aziza.id);

    const self = await client
      .post('/api/conversations')
      .send({ recipientUsername: 'aziza', body: 'Hi me' })
      .expect(400);
    expect(bodyOf(self)).toMatchObject({ errorCode: 'MESSAGE_SELF' });
    const unknown = await client
      .post('/api/conversations')
      .send({ recipientUsername: 'nobody', body: 'Hi' })
      .expect(404);
    expect(bodyOf(unknown)).toMatchObject({ errorCode: 'USER_NOT_FOUND' });
    await client
      .post('/api/conversations')
      .send({ recipientUsername: 'rustam', body: '' })
      .expect(400);
    await client
      .post('/api/conversations')
      .send({ recipientUsername: 'rustam', body: 'x'.repeat(2001) })
      .expect(400);
    await client
      .post('/api/conversations')
      .send({ recipientUsername: 'rustam', body: 'x'.repeat(2000) })
      .expect(201);
    // messages are trimmed and nothing was created by the failed attempts
    expect(
      bodyOf<Page<Conversation>>(
        await client.get('/api/conversations').expect(200),
      ).total,
    ).toBe(1);
  });

  it('long chats: only the newest messages are returned, still oldest first', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    await createUser(ctx.prisma, { username: 'rustam' });
    const client = clientWithToken(ctx.app, aziza.id);
    const conversation = bodyOf<Conversation>(
      await client
        .post('/api/conversations')
        .send({ recipientUsername: 'rustam', body: 'm1' })
        .expect(201),
    );
    for (const n of [2, 3, 4, 5]) {
      await client
        .post(`/api/conversations/${conversation.id}/messages`)
        .send({ body: `m${n}` })
        .expect(201);
    }
    const lastThree = bodyOf<Message[]>(
      await client
        .get(`/api/conversations/${conversation.id}/messages?limit=3`)
        .expect(200),
    );
    expect(lastThree.map((m) => m.body)).toEqual(['m3', 'm4', 'm5']);
    await client
      .get(`/api/conversations/${conversation.id}/messages?limit=101`)
      .expect(400);
    await client
      .get(`/api/conversations/${conversation.id}/messages?after=yesterday`)
      .expect(400);
  });
});
