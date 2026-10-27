import { PostStatus, Role } from '@prisma/client';
import { PostsService } from '../src/modules/posts/posts.service';
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
  title: string;
  status: string;
  price: number | null;
  priceUnit: string | null;
  contactTelegram: string | null;
  commentsCount: number;
  isFavorite: boolean;
  expiresAt: string;
  createdAt: string;
  author: { username: string };
}
interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

describe('Posts (e2e)', () => {
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

  it('register → login → create post → comment → resolve (the main flow)', async () => {
    const azizaClient = guestClient(ctx.app);

    // register: lowercase username, cookie is httpOnly, never a password in the answer
    const registered = await azizaClient
      .post('/api/auth/register')
      .send({
        email: 'Aziza@Example.com',
        username: 'Aziza_1',
        password: 'Test12345',
      })
      .expect(201);
    expect(bodyOf(registered)).toMatchObject({
      username: 'aziza_1',
      email: 'aziza@example.com',
      role: 'USER',
      isStudentVerified: false,
    });
    expect(JSON.stringify(registered.body)).not.toMatch(/password/i);
    const cookie = (
      registered.headers['set-cookie'] as unknown as string[]
    ).join(';');
    expect(cookie).toContain('access_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    // registering logs in
    await azizaClient.get('/api/auth/me').expect(200);

    // create a post
    const created = await azizaClient
      .post('/api/posts')
      .send(validPost)
      .expect(201);
    const post = bodyOf<Post>(created);
    expect(post).toMatchObject({
      status: 'ACTIVE',
      price: 100,
      priceUnit: 'PER_HOUR',
      contactTelegram: 'aziza_tutor',
      commentsCount: 0,
    });
    const days =
      (new Date(post.expiresAt).getTime() -
        new Date(post.createdAt).getTime()) /
      86_400_000;
    expect(days).toBeCloseTo(30, 1);

    // a guest sees it in the list; the response never contains author ids
    const list = await guestClient(ctx.app).get('/api/posts').expect(200);
    expect(bodyOf<Page<Post>>(list).items.map((item) => item.id)).toContain(
      post.id,
    );
    expect(JSON.stringify(list.body)).not.toContain('authorId');

    // another user comments
    await createUser(ctx.prisma, { username: 'rustam' });
    const rustam = await loginAs(ctx.app, 'rustam');
    await rustam
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'Do you teach on weekends?' })
      .expect(201);

    // the author is notified and can see the comment
    await azizaClient
      .get('/api/notifications/unread-count')
      .expect(200)
      .expect({ count: 1 });
    const notifications = await azizaClient
      .get('/api/notifications')
      .expect(200);
    expect(
      bodyOf<Page<{ type: string; actorUsername: string; postId: string }>>(
        notifications,
      ).items[0],
    ).toMatchObject({
      type: 'NEW_COMMENT',
      actorUsername: 'rustam',
      postId: post.id,
    });
    const comments = await guestClient(ctx.app)
      .get(`/api/posts/${post.id}/comments`)
      .expect(200);
    expect(bodyOf<Page<{ body: string }>>(comments).items[0].body).toBe(
      'Do you teach on weekends?',
    );

    // the author resolves the post; commenting is closed afterwards
    const resolved = await azizaClient
      .post(`/api/posts/${post.id}/resolve`)
      .expect(200);
    expect(bodyOf<Post>(resolved).status).toBe('RESOLVED');
    const late = await rustam
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'Too late?' })
      .expect(409);
    expect(bodyOf(late)).toMatchObject({ errorCode: 'POST_NOT_ACTIVE' });
    await azizaClient.post(`/api/posts/${post.id}/resolve`).expect(409);

    // detail shows the final state
    const detail = await guestClient(ctx.app)
      .get(`/api/posts/${post.id}`)
      .expect(200);
    expect(bodyOf<Post>(detail)).toMatchObject({
      status: 'RESOLVED',
      commentsCount: 1,
    });

    // logout clears the session
    const loggedOut = await azizaClient.post('/api/auth/logout').expect(204);
    expect(
      (loggedOut.headers['set-cookie'] as unknown as string[]).join(';'),
    ).toContain('access_token=;');
    await azizaClient.get('/api/auth/me').expect(401);

    // login again by username and by email
    await guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'aziza_1', password: 'Test12345' })
      .expect(200);
    await guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'AZIZA@example.com', password: 'Test12345' })
      .expect(200);
  });

  it('registration and login errors', async () => {
    const guest = guestClient(ctx.app);
    await guest
      .post('/api/auth/register')
      .send({ email: 'a@example.com', username: 'aaa', password: 'Test12345' })
      .expect(201);
    const sameEmail = await guest
      .post('/api/auth/register')
      .send({ email: 'A@example.com', username: 'bbb', password: 'Test12345' })
      .expect(409);
    expect(bodyOf(sameEmail)).toMatchObject({ errorCode: 'EMAIL_TAKEN' });
    const sameUsername = await guest
      .post('/api/auth/register')
      .send({ email: 'b@example.com', username: 'AAA', password: 'Test12345' })
      .expect(409);
    expect(bodyOf(sameUsername)).toMatchObject({ errorCode: 'USERNAME_TAKEN' });

    const wrong = await guest
      .post('/api/auth/login')
      .send({ emailOrUsername: 'aaa', password: 'Wrong12345' })
      .expect(401);
    expect(bodyOf(wrong)).toMatchObject({ errorCode: 'INVALID_CREDENTIALS' });
    const unknown = await guest
      .post('/api/auth/login')
      .send({ emailOrUsername: 'nobody', password: 'Test12345' })
      .expect(401);
    expect(bodyOf(unknown)).toMatchObject({ errorCode: 'INVALID_CREDENTIALS' });
  });

  it('post rules: contact, price and price unit, coordinates', async () => {
    const user = await createUser(ctx.prisma, { username: 'aziza' });
    const aziza = clientWithToken(ctx.app, user.id);
    const base = {
      title: 'A valid post title',
      description: 'A valid description for the post.',
      district: 'SINO',
    };

    const noContact = await aziza
      .post('/api/posts')
      .send({ ...base, category: 'OTHER' })
      .expect(400);
    expect(bodyOf(noContact)).toMatchObject({ errorCode: 'CONTACT_REQUIRED' });

    const priceOnLost = await aziza
      .post('/api/posts')
      .send({
        ...base,
        category: 'LOST_FOUND',
        price: 50,
        priceUnit: 'ONCE',
        contactPhone: '+992 90 123-45-67',
      })
      .expect(400);
    expect(bodyOf(priceOnLost)).toMatchObject({
      errorCode: 'PRICE_NOT_ALLOWED',
    });

    const noUnit = await aziza
      .post('/api/posts')
      .send({
        ...base,
        category: 'RENTALS',
        price: 900,
        contactPhone: '+992901234567',
      })
      .expect(400);
    expect(bodyOf(noUnit)).toMatchObject({ errorCode: 'PRICE_UNIT_REQUIRED' });

    const halfPin = await aziza
      .post('/api/posts')
      .send({
        ...base,
        category: 'OTHER',
        contactPhone: '+992901234567',
        latitude: 38.5,
      })
      .expect(400);
    expect(bodyOf(halfPin)).toMatchObject({ errorCode: 'VALIDATION_FAILED' });

    // phone numbers are cleaned, @ is removed from Telegram names
    const ok = await aziza
      .post('/api/posts')
      .send({
        ...base,
        category: 'RENTALS',
        price: 900,
        priceUnit: 'PER_MONTH',
        contactPhone: '+992 (90) 123-45-67',
        contactTelegram: '@room_owner',
        latitude: 38.56,
        longitude: 68.78,
      })
      .expect(201);
    expect(bodyOf(ok)).toMatchObject({
      contactPhone: '+992901234567',
      contactTelegram: 'room_owner',
      latitude: 38.56,
      longitude: 68.78,
    });

    // a bad Telegram name and a too short title are refused
    await aziza
      .post('/api/posts')
      .send({ ...base, category: 'OTHER', contactTelegram: 'a b' })
      .expect(400);
    await aziza
      .post('/api/posts')
      .send({
        ...base,
        title: 'Hi',
        category: 'OTHER',
        contactPhone: '+992901234567',
      })
      .expect(400);
  });

  it('only the author edits or deletes; an admin may delete; guests cannot write', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const rustam = await createUser(ctx.prisma, { username: 'rustam' });
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const azizaClient = clientWithToken(ctx.app, aziza.id);
    const rustamClient = clientWithToken(ctx.app, rustam.id);

    await guestClient(ctx.app).post('/api/posts').send(validPost).expect(401);

    const post = bodyOf<Post>(
      await azizaClient.post('/api/posts').send(validPost).expect(201),
    );

    const edited = await azizaClient
      .patch(`/api/posts/${post.id}`)
      .send({ title: 'Math tutor, now evenings', price: null })
      .expect(200);
    expect(bodyOf<Post>(edited)).toMatchObject({
      title: 'Math tutor, now evenings',
      price: null,
      priceUnit: null,
      contactTelegram: 'aziza_tutor',
    });

    const notOwner = await rustamClient
      .patch(`/api/posts/${post.id}`)
      .send({ title: 'Stolen post title' })
      .expect(403);
    expect(bodyOf(notOwner)).toMatchObject({ errorCode: 'POST_NOT_OWNER' });
    await clientWithToken(ctx.app, admin.id)
      .patch(`/api/posts/${post.id}`)
      .send({ title: 'Admin edits' })
      .expect(403);
    await rustamClient.delete(`/api/posts/${post.id}`).expect(403);
    await rustamClient.post(`/api/posts/${post.id}/resolve`).expect(403);

    await azizaClient.delete(`/api/posts/${post.id}`).expect(204);
    await guestClient(ctx.app).get(`/api/posts/${post.id}`).expect(404);
    await azizaClient.delete(`/api/posts/${post.id}`).expect(404);

    const second = bodyOf<Post>(
      await azizaClient.post('/api/posts').send(validPost).expect(201),
    );
    await clientWithToken(ctx.app, admin.id)
      .delete(`/api/posts/${second.id}`)
      .expect(204);
  });

  it('browse: search, filters, price range, sort, pagination and counts', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const client = clientWithToken(ctx.app, aziza.id);
    const make = (extra: Record<string, unknown>) =>
      client
        .post('/api/posts')
        .send({
          description: 'A description that is long enough.',
          contactTelegram: 'aziza_tutor',
          ...extra,
        })
        .expect(201);

    await make({
      title: 'Python lessons for beginners',
      category: 'TUTORING',
      district: 'SINO',
      price: 150,
      priceUnit: 'PER_HOUR',
    });
    await make({
      title: 'English conversation club',
      category: 'TUTORING',
      district: 'FIRDAVSI',
      price: 80,
      priceUnit: 'PER_HOUR',
    });
    await make({
      title: 'Room near the campus',
      category: 'RENTALS',
      district: 'UNIVERSITY_CAMPUS',
      price: 1200,
      priceUnit: 'PER_MONTH',
    });
    await make({
      title: 'Found a black wallet',
      category: 'LOST_FOUND',
      district: 'SINO',
    });
    await make({
      title: 'Free bicycle for a child',
      category: 'OTHER',
      district: 'SINO',
    });

    const guest = guestClient(ctx.app);
    const get = async (query: string) =>
      bodyOf<Page<Post>>(await guest.get(`/api/posts${query}`).expect(200));

    expect((await get('')).total).toBe(5);
    expect((await get('?category=TUTORING')).total).toBe(2);
    expect((await get('?district=SINO')).total).toBe(3);
    expect((await get('?category=TUTORING&district=SINO')).total).toBe(1);
    expect((await get('?q=PYTHON')).items[0].title).toBe(
      'Python lessons for beginners',
    );
    expect((await get('?q=campus')).total).toBe(1);
    expect((await get('?minPrice=100&maxPrice=2000')).total).toBe(2);

    const cheapFirst = (await get('?sort=price_asc')).items.map(
      (item) => item.price,
    );
    expect(cheapFirst).toEqual([80, 150, 1200, null, null]);
    const expensiveFirst = (await get('?sort=price_desc')).items.map(
      (item) => item.price,
    );
    expect(expensiveFirst).toEqual([1200, 150, 80, null, null]);
    expect((await get('?sort=newest')).items[0].title).toBe(
      'Free bicycle for a child',
    );
    expect((await get('?sort=oldest')).items[0].title).toBe(
      'Python lessons for beginners',
    );

    const page2 = await get('?page=2&limit=2');
    expect(page2).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(page2.items).toHaveLength(2);

    // counts follow the other filters
    const counts = bodyOf<Record<string, number>>(
      await guest.get('/api/posts/counts').expect(200),
    );
    expect(counts).toEqual({
      ALL: 5,
      LOST_FOUND: 1,
      TUTORING: 2,
      RENTALS: 1,
      OTHER: 1,
    });
    const sinoCounts = bodyOf<Record<string, number>>(
      await guest.get('/api/posts/counts?district=SINO').expect(200),
    );
    expect(sinoCounts).toEqual({
      ALL: 3,
      LOST_FOUND: 1,
      TUTORING: 1,
      RENTALS: 0,
      OTHER: 1,
    });

    // bad queries are refused
    await guest.get('/api/posts?limit=100').expect(400);
    await guest.get('/api/posts?category=CARS').expect(400);
    await guest.get('/api/posts?sort=random').expect(400);
  });

  it('expiry: expired posts leave the public list on read, and the author can renew', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const rustam = await createUser(ctx.prisma, { username: 'rustam' });
    const azizaClient = clientWithToken(ctx.app, aziza.id);
    const post = bodyOf<Post>(
      await azizaClient.post('/api/posts').send(validPost).expect(201),
    );

    // make it 1 day past its expiry date directly in the database (as if 31 days had passed)
    await ctx.prisma.post.update({
      where: { id: post.id },
      data: { expiresAt: new Date(Date.now() - 86_400_000) },
    });

    const guest = guestClient(ctx.app);
    expect((await guest.get('/api/posts').expect(200)).body).toMatchObject({
      total: 0,
    });
    expect(
      (await guest.get('/api/posts/counts').expect(200)).body,
    ).toMatchObject({ ALL: 0 });
    expect(
      bodyOf<Post>(await guest.get(`/api/posts/${post.id}`).expect(200)).status,
    ).toBe('EXPIRED');
    expect(
      bodyOf<Page<Post>>(
        await azizaClient.get('/api/posts/mine?status=EXPIRED').expect(200),
      ).total,
    ).toBe(1);

    // closed for comments, and the sweep wrote EXPIRED in the database
    await clientWithToken(ctx.app, rustam.id)
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'Still there?' })
      .expect(409);
    await azizaClient.post(`/api/posts/${post.id}/resolve`).expect(409);
    // the sweep (daily job, and on reads at most once a minute) writes EXPIRED in the database
    expect(await ctx.app.get(PostsService).expireOverdue(true)).toBe(1);
    expect(
      (await ctx.prisma.post.findUniqueOrThrow({ where: { id: post.id } }))
        .status,
    ).toBe(PostStatus.EXPIRED);

    // only the author can renew
    await clientWithToken(ctx.app, rustam.id)
      .post(`/api/posts/${post.id}/renew`)
      .expect(403);
    const renewed = bodyOf<Post>(
      await azizaClient.post(`/api/posts/${post.id}/renew`).expect(200),
    );
    expect(renewed.status).toBe('ACTIVE');
    expect(
      (new Date(renewed.expiresAt).getTime() - Date.now()) / 86_400_000,
    ).toBeCloseTo(30, 1);
    expect((await guest.get('/api/posts').expect(200)).body).toMatchObject({
      total: 1,
    });

    // a fresh post cannot be renewed
    const renewAgain = await azizaClient
      .post(`/api/posts/${post.id}/renew`)
      .expect(409);
    expect(bodyOf(renewAgain)).toMatchObject({
      errorCode: 'RENEW_NOT_ALLOWED',
    });
  });
});
