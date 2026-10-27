import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  guestClient,
  resetDatabase,
  TestContext,
  validPost,
} from './helpers';

describe('Rate limiting (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // These tests need the real limits (every other e2e file switches them off).
    process.env.THROTTLE_DISABLED = 'false';
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    process.env.THROTTLE_DISABLED = 'true';
    await ctx.app.close();
  });

  it('login: 5 tries per minute, then 429 TOO_MANY_REQUESTS (even with the right password)', async () => {
    await createUser(ctx.prisma, { username: 'aziza' });
    const guest = guestClient(ctx.app);
    for (let attempt = 1; attempt <= 5; attempt++) {
      await guest
        .post('/api/auth/login')
        .send({ emailOrUsername: 'aziza', password: 'Wrong12345' })
        .expect(401);
    }
    const limited = await guest
      .post('/api/auth/login')
      .send({ emailOrUsername: 'aziza', password: 'Wrong12345' })
      .expect(429);
    expect(bodyOf(limited)).toMatchObject({
      statusCode: 429,
      errorCode: 'TOO_MANY_REQUESTS',
    });
    await guest
      .post('/api/auth/login')
      .send({ emailOrUsername: 'aziza', password: 'Test12345' })
      .expect(429);
  });

  it('register: 5 per minute, then 429', async () => {
    const guest = guestClient(ctx.app);
    for (let n = 1; n <= 5; n++) {
      await guest
        .post('/api/auth/register')
        .send({
          email: `user${n}@example.com`,
          username: `user${n}`,
          password: 'Test12345',
        })
        .expect(201);
    }
    const limited = await guest
      .post('/api/auth/register')
      .send({
        email: 'user6@example.com',
        username: 'user6',
        password: 'Test12345',
      })
      .expect(429);
    expect(bodyOf(limited)).toMatchObject({ errorCode: 'TOO_MANY_REQUESTS' });
  });

  it('other endpoints keep working while login is limited (each route has its own counter)', async () => {
    await guestClient(ctx.app).get('/api/posts').expect(200);
    await guestClient(ctx.app).get('/api/health').expect(200);
  });

  it('create post: 10 per hour, then 429', async () => {
    const user = await createUser(ctx.prisma, { username: 'poster' });
    const client = clientWithToken(ctx.app, user.id);
    for (let n = 1; n <= 10; n++) {
      await client.post('/api/posts').send(validPost).expect(201);
    }
    const limited = await client.post('/api/posts').send(validPost).expect(429);
    expect(bodyOf(limited)).toMatchObject({ errorCode: 'TOO_MANY_REQUESTS' });
  });

  it('create comment: 20 per 10 minutes, then 429', async () => {
    const author = await createUser(ctx.prisma, { username: 'author' });
    const commenter = await createUser(ctx.prisma, { username: 'commenter' });
    const post = await ctx.prisma.post.create({
      data: {
        title: 'A post to comment on',
        description: 'A description that is long enough.',
        category: 'OTHER',
        district: 'SINO',
        contactTelegram: 'author_chat',
        expiresAt: new Date(Date.now() + 86_400_000),
        authorId: author.id,
      },
    });
    const client = clientWithToken(ctx.app, commenter.id);
    for (let n = 1; n <= 20; n++) {
      await client
        .post(`/api/posts/${post.id}/comments`)
        .send({ body: `Comment ${n}` })
        .expect(201);
    }
    await client
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'One too many' })
      .expect(429);
  });

  it('report: 10 per hour, then 429', async () => {
    const author = await createUser(ctx.prisma, { username: 'author2' });
    const reporter = await createUser(ctx.prisma, { username: 'reporter' });
    const client = clientWithToken(ctx.app, reporter.id);
    const ids: string[] = [];
    for (let n = 1; n <= 11; n++) {
      const post = await ctx.prisma.post.create({
        data: {
          title: `Reportable post ${n}`,
          description: 'A description that is long enough.',
          category: 'OTHER',
          district: 'SINO',
          contactTelegram: 'author_chat',
          expiresAt: new Date(Date.now() + 86_400_000),
          authorId: author.id,
        },
      });
      ids.push(post.id);
    }
    for (const id of ids.slice(0, 10)) {
      await client
        .post(`/api/posts/${id}/report`)
        .send({ reason: 'SPAM' })
        .expect(201);
    }
    const limited = await client
      .post(`/api/posts/${ids[10]}/report`)
      .send({ reason: 'SPAM' })
      .expect(429);
    expect(bodyOf(limited)).toMatchObject({ errorCode: 'TOO_MANY_REQUESTS' });
  });

  it('messages: 30 per minute, then 429', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'chatter' });
    await createUser(ctx.prisma, { username: 'listener' });
    const client = clientWithToken(ctx.app, aziza.id);
    const first = await client
      .post('/api/conversations')
      .send({ recipientUsername: 'listener', body: 'first' })
      .expect(201);
    const conversationId = bodyOf<{ id: string }>(first).id;
    // "send a message" has its own counter: 30 are fine, the 31st is refused.
    for (let n = 1; n <= 30; n++) {
      await client
        .post(`/api/conversations/${conversationId}/messages`)
        .send({ body: `m${n}` })
        .expect(201);
    }
    const limited = await client
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ body: 'm31' })
      .expect(429);
    expect(bodyOf(limited)).toMatchObject({ errorCode: 'TOO_MANY_REQUESTS' });
  });

  it('university email: 3 per hour, then 429', async () => {
    const user = await createUser(ctx.prisma, { username: 'student' });
    const client = clientWithToken(ctx.app, user.id);
    // Not a university domain: refused with 400 each time, but every try counts.
    for (let n = 1; n <= 3; n++) {
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'student@gmail.com' })
        .expect(400);
    }
    await client
      .post('/api/users/me/university-email')
      .send({ universityEmail: 'student@gmail.com' })
      .expect(429);
  });
});
