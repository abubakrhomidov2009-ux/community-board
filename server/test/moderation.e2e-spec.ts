import { Role } from '@prisma/client';
import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  guestClient,
  loginAs,
  resetDatabase,
  TestContext,
  validPost,
} from './helpers';

interface Post {
  id: string;
  status: string;
}
interface Page<T> {
  items: T[];
  total: number;
}
interface Report {
  id: string;
  status: string;
  reason: string;
  post: { id: string; author: { username: string } };
  reporter: { username: string };
}

describe('Moderation: reports, admin and blocked users (e2e)', () => {
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

  it('report → admin removes post → post is hidden and the author is told', async () => {
    const author = await createUser(ctx.prisma, { username: 'rustam' });
    const reporter = await createUser(ctx.prisma, { username: 'aziza' });
    const other = await createUser(ctx.prisma, { username: 'madina' });
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const authorClient = clientWithToken(ctx.app, author.id);
    const reporterClient = clientWithToken(ctx.app, reporter.id);
    const adminClient = clientWithToken(ctx.app, admin.id);

    const post = bodyOf<Post>(
      await authorClient
        .post('/api/posts')
        .send({ ...validPost, title: 'Click here to win a free phone' })
        .expect(201),
    );

    // reporting rules: login needed, one report per user, not on your own post
    await guestClient(ctx.app)
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SPAM' })
      .expect(401);
    await authorClient
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SPAM' })
      .expect(400)
      .expect((res) => {
        expect(bodyOf(res)).toMatchObject({ errorCode: 'REPORT_OWN_POST' });
      });
    await reporterClient
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'BORING' })
      .expect(400);
    const first = await reporterClient
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SPAM', details: 'Posted every day' })
      .expect(201);
    expect(bodyOf(first)).toMatchObject({
      status: 'OPEN',
      reason: 'SPAM',
      postId: post.id,
    });
    const second = await reporterClient
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SCAM' })
      .expect(409);
    expect(bodyOf(second)).toMatchObject({
      errorCode: 'REPORT_ALREADY_EXISTS',
    });
    await clientWithToken(ctx.app, other.id)
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'OFFENSIVE' })
      .expect(201);

    // the admin sees both open reports, with who and what
    await reporterClient
      .get('/api/admin/reports')
      .expect(403)
      .expect((res) => {
        expect(bodyOf(res)).toMatchObject({ errorCode: 'ADMIN_ONLY' });
      });
    const open = bodyOf<Page<Report>>(
      await adminClient.get('/api/admin/reports?status=OPEN').expect(200),
    );
    expect(open.total).toBe(2);
    expect(open.items[0].post).toMatchObject({
      id: post.id,
      author: { username: 'rustam' },
    });
    expect(open.items.map((r) => r.reporter.username).sort()).toEqual([
      'aziza',
      'madina',
    ]);
    expect(
      bodyOf<{ reportsOpen: number }>(
        await adminClient.get('/api/admin/stats').expect(200),
      ).reportsOpen,
    ).toBe(2);

    // the admin removes the post
    const removed = await adminClient
      .patch(`/api/admin/posts/${post.id}/remove`)
      .send({ reason: 'Spam' })
      .expect(200);
    expect(bodyOf(removed)).toMatchObject({
      status: 'REMOVED',
      removedReason: 'Spam',
    });

    // it disappears for everybody except its author and admins
    expect(
      bodyOf<Page<Post>>(await reporterClient.get('/api/posts').expect(200))
        .total,
    ).toBe(0);
    expect(
      bodyOf<{ ALL: number }>(
        await reporterClient.get('/api/posts/counts').expect(200),
      ).ALL,
    ).toBe(0);
    await guestClient(ctx.app).get(`/api/posts/${post.id}`).expect(401);
    await reporterClient.get(`/api/posts/${post.id}`).expect(404);
    expect(
      bodyOf<Post>(await authorClient.get(`/api/posts/${post.id}`).expect(200))
        .status,
    ).toBe('REMOVED');
    expect(
      bodyOf<Post>(await adminClient.get(`/api/posts/${post.id}`).expect(200))
        .status,
    ).toBe('REMOVED');
    expect(
      bodyOf<Page<Post>>(await authorClient.get('/api/posts/mine').expect(200))
        .items[0].status,
    ).toBe('REMOVED');
    await reporterClient
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'Hello' })
      .expect(404);
    await reporterClient.put(`/api/posts/${post.id}/favorite`).expect(404);
    await authorClient
      .patch(`/api/posts/${post.id}`)
      .send({ title: 'Trying to edit it' })
      .expect(409);

    // its open reports are closed, and the author got a notification
    expect(
      bodyOf<Page<Report>>(
        await adminClient.get('/api/admin/reports?status=OPEN').expect(200),
      ).total,
    ).toBe(0);
    expect(
      bodyOf<Page<Report>>(
        await adminClient.get('/api/admin/reports?status=RESOLVED').expect(200),
      ).total,
    ).toBe(2);
    const notifications = bodyOf<Page<{ type: string; postId: string }>>(
      await authorClient.get('/api/notifications').expect(200),
    );
    expect(notifications.items[0]).toMatchObject({
      type: 'POST_REMOVED',
      postId: post.id,
    });

    // removing again is harmless and sends no second notification
    await adminClient
      .patch(`/api/admin/posts/${post.id}/remove`)
      .send({})
      .expect(200);
    expect(
      bodyOf<Page<unknown>>(
        await authorClient.get('/api/notifications').expect(200),
      ).total,
    ).toBe(1);

    // restore brings it back
    const restored = await adminClient
      .patch(`/api/admin/posts/${post.id}/restore`)
      .expect(200);
    expect(bodyOf(restored)).toMatchObject({
      status: 'ACTIVE',
      removedReason: null,
    });
    expect(
      bodyOf<Page<Post>>(await reporterClient.get('/api/posts').expect(200))
        .total,
    ).toBe(1);
    await adminClient.patch(`/api/admin/posts/${post.id}/restore`).expect(409);
  });

  it('admin can resolve or dismiss reports and manage posts and users lists', async () => {
    const author = await createUser(ctx.prisma, { username: 'rustam' });
    const reporter = await createUser(ctx.prisma, { username: 'aziza' });
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const post = bodyOf<Post>(
      await clientWithToken(ctx.app, author.id)
        .post('/api/posts')
        .send(validPost)
        .expect(201),
    );
    await clientWithToken(ctx.app, reporter.id)
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'OTHER' })
      .expect(201);
    const adminClient = clientWithToken(ctx.app, admin.id);

    const report = bodyOf<Page<Report>>(
      await adminClient.get('/api/admin/reports').expect(200),
    ).items[0];
    const dismissed = await adminClient
      .patch(`/api/admin/reports/${report.id}`)
      .send({ status: 'DISMISSED' })
      .expect(200);
    expect(bodyOf(dismissed)).toMatchObject({ status: 'DISMISSED' });
    await adminClient
      .patch(`/api/admin/reports/${report.id}`)
      .send({ status: 'OPEN' })
      .expect(400);
    await adminClient
      .patch('/api/admin/reports/unknown')
      .send({ status: 'RESOLVED' })
      .expect(404);
    await adminClient.get('/api/admin/reports?sortBy=password').expect(400);

    const posts = bodyOf<Page<{ openReportsCount: number }>>(
      await adminClient.get('/api/admin/posts?q=math').expect(200),
    );
    expect(posts.total).toBe(1);
    const users = await adminClient
      .get('/api/admin/users?sortBy=username&order=asc')
      .expect(200);
    expect(
      bodyOf<Page<{ username: string }>>(users).items.map((u) => u.username),
    ).toEqual(['admin', 'aziza', 'rustam']);
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');

    // every admin endpoint refuses normal users and guests
    const userClient = clientWithToken(ctx.app, reporter.id);
    for (const path of [
      '/api/admin/stats',
      '/api/admin/reports',
      '/api/admin/posts',
      '/api/admin/users',
    ]) {
      await userClient.get(path).expect(403);
      await guestClient(ctx.app).get(path).expect(401);
    }
    await userClient
      .patch(`/api/admin/posts/${post.id}/remove`)
      .send({})
      .expect(403);
    await userClient.patch(`/api/admin/users/${author.id}/block`).expect(403);
  });

  it('blocked users cannot log in, use an old session, or create anything', async () => {
    const victim = await createUser(ctx.prisma, { username: 'rustam' });
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const adminClient = clientWithToken(ctx.app, admin.id);

    // rustam is logged in and has a post
    const rustam = await loginAs(ctx.app, 'rustam');
    const post = bodyOf<Post>(
      await rustam.post('/api/posts').send(validPost).expect(201),
    );
    await rustam.get('/api/auth/me').expect(200);

    // admin blocks him
    const blocked = await adminClient
      .patch(`/api/admin/users/${victim.id}/block`)
      .expect(200);
    expect(bodyOf(blocked)).toMatchObject({
      isBlocked: true,
      username: 'rustam',
    });

    // new login is refused (only with the right password: wrong passwords do not reveal the block)
    const login = await guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'rustam', password: 'Test12345' })
      .expect(403);
    expect(bodyOf(login)).toMatchObject({ errorCode: 'USER_BLOCKED' });
    const wrong = await guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'rustam', password: 'Wrong12345' })
      .expect(401);
    expect(bodyOf(wrong)).toMatchObject({ errorCode: 'INVALID_CREDENTIALS' });

    // the session he already had is refused on every protected endpoint
    const me = await rustam.get('/api/auth/me').expect(403);
    expect(bodyOf(me)).toMatchObject({ errorCode: 'USER_BLOCKED' });
    await rustam.post('/api/posts').send(validPost).expect(403);
    await rustam
      .patch(`/api/posts/${post.id}`)
      .send({ title: 'Edited while blocked' })
      .expect(403);
    await rustam
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'I am blocked' })
      .expect(403);
    await rustam.put(`/api/posts/${post.id}/favorite`).expect(403);
    await rustam
      .post('/api/conversations')
      .send({ recipientUsername: 'aziza', body: 'Hi' })
      .expect(403);
    await rustam.get('/api/notifications').expect(403);

    // others cannot find him: no public profile, cannot message him
    const azizaClient = clientWithToken(ctx.app, aziza.id);
    await azizaClient.get('/api/users/rustam').expect(404);
    await azizaClient
      .post('/api/conversations')
      .send({ recipientUsername: 'rustam', body: 'Hi' })
      .expect(404);

    // unblocking gives everything back
    await adminClient
      .patch(`/api/admin/users/${victim.id}/unblock`)
      .expect(200);
    await guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'rustam', password: 'Test12345' })
      .expect(200);
    await rustam.get('/api/auth/me').expect(200);
    await azizaClient.get('/api/users/rustam').expect(200);
  });

  it('an admin cannot block another admin or themselves, and unknown ids give 404', async () => {
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const second = await createUser(ctx.prisma, {
      username: 'admin2',
      role: Role.ADMIN,
    });
    const adminClient = clientWithToken(ctx.app, admin.id);

    const other = await adminClient
      .patch(`/api/admin/users/${second.id}/block`)
      .expect(403);
    expect(bodyOf(other)).toMatchObject({ errorCode: 'FORBIDDEN_ROLE' });
    await adminClient.patch(`/api/admin/users/${admin.id}/block`).expect(403);
    await adminClient.patch('/api/admin/users/unknown/block').expect(404);
    await adminClient.patch('/api/admin/users/unknown/unblock').expect(404);
    await adminClient
      .patch('/api/admin/posts/unknown/remove')
      .send({})
      .expect(404);
  });

  it('the role is read from the database on every request, not from the token', async () => {
    const user = await createUser(ctx.prisma, { username: 'aziza' });
    const client = clientWithToken(ctx.app, user.id);
    await client.get('/api/admin/stats').expect(403);
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN },
    });
    await client.get('/api/admin/stats').expect(200);
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { role: Role.USER },
    });
    await client.get('/api/admin/stats').expect(403);
  });
});
