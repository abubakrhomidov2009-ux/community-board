import { createHash } from 'node:crypto';
import { MailService } from '../src/modules/mail/mail.service';
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

interface Post {
  id: string;
  isFavorite: boolean;
  title: string;
}
interface Page<T> {
  items: T[];
  total: number;
}
interface SentMail {
  to: string;
  username: string;
  locale: string;
  link: string;
}

describe('Favorites, profiles, language and student badge (e2e)', () => {
  let ctx: TestContext;
  const mail = { sendVerificationEmail: jest.fn<Promise<void>, [SentMail]>() };

  beforeAll(async () => {
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(MailService).useValue(mail),
    );
  });

  beforeEach(async () => {
    mail.sendVerificationEmail.mockReset();
    mail.sendVerificationEmail.mockResolvedValue(undefined);
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('favorites: save, isFavorite everywhere, Saved page, remove', async () => {
    const author = await createUser(ctx.prisma, { username: 'rustam' });
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const madina = await createUser(ctx.prisma, { username: 'madina' });
    const post = bodyOf<Post>(
      await clientWithToken(ctx.app, author.id)
        .post('/api/posts')
        .send(validPost)
        .expect(201),
    );
    const azizaClient = clientWithToken(ctx.app, aziza.id);

    await guestClient(ctx.app)
      .put(`/api/posts/${post.id}/favorite`)
      .expect(401);
    await guestClient(ctx.app).get('/api/favorites').expect(401);

    await azizaClient.put(`/api/posts/${post.id}/favorite`).expect(204);
    await azizaClient.put(`/api/posts/${post.id}/favorite`).expect(204); // saving twice is fine
    await azizaClient.put('/api/posts/unknown/favorite').expect(404);

    // isFavorite is true for aziza only, in the detail and in the list
    expect(
      bodyOf<Post>(await azizaClient.get(`/api/posts/${post.id}`).expect(200))
        .isFavorite,
    ).toBe(true);
    expect(
      bodyOf<Page<Post>>(await azizaClient.get('/api/posts').expect(200))
        .items[0].isFavorite,
    ).toBe(true);
    expect(
      bodyOf<Post>(
        await clientWithToken(ctx.app, madina.id)
          .get(`/api/posts/${post.id}`)
          .expect(200),
      ).isFavorite,
    ).toBe(false);
    // guests are not allowed to read posts at all
    await guestClient(ctx.app).get(`/api/posts/${post.id}`).expect(401);

    // Saved page
    const saved = bodyOf<Page<Post>>(
      await azizaClient.get('/api/favorites').expect(200),
    );
    expect(saved.total).toBe(1);
    expect(saved.items[0]).toMatchObject({ id: post.id, isFavorite: true });
    expect(
      bodyOf<Page<Post>>(
        await clientWithToken(ctx.app, madina.id)
          .get('/api/favorites')
          .expect(200),
      ).total,
    ).toBe(0);

    // remove
    await azizaClient.delete(`/api/posts/${post.id}/favorite`).expect(204);
    await azizaClient.delete(`/api/posts/${post.id}/favorite`).expect(204);
    expect(
      bodyOf<Page<Post>>(await azizaClient.get('/api/favorites').expect(200))
        .total,
    ).toBe(0);
    expect(
      bodyOf<Post>(await azizaClient.get(`/api/posts/${post.id}`).expect(200))
        .isFavorite,
    ).toBe(false);

    // deleting a post removes it from everybody's Saved page
    await azizaClient.put(`/api/posts/${post.id}/favorite`).expect(204);
    await clientWithToken(ctx.app, author.id)
      .delete(`/api/posts/${post.id}`)
      .expect(204);
    expect(
      bodyOf<Page<Post>>(await azizaClient.get('/api/favorites').expect(200))
        .total,
    ).toBe(0);
  });

  it('public profile: only safe data, active posts only, case-insensitive', async () => {
    const aziza = await createUser(ctx.prisma, {
      username: 'aziza',
      isStudentVerified: true,
    });
    const client = clientWithToken(ctx.app, aziza.id);
    const active = bodyOf<Post>(
      await client.post('/api/posts').send(validPost).expect(201),
    );
    const resolved = bodyOf<Post>(
      await client
        .post('/api/posts')
        .send({ ...validPost, title: 'Already resolved post' })
        .expect(201),
    );
    await client.post(`/api/posts/${resolved.id}/resolve`).expect(200);

    const profile = await client.get('/api/users/AZIZA').expect(200);
    expect(bodyOf(profile)).toMatchObject({
      username: 'aziza',
      isStudentVerified: true,
      activePostsCount: 1,
    });
    expect(Object.keys(bodyOf(profile)).sort()).toEqual([
      'activePostsCount',
      'avatarUrl',
      'createdAt',
      'isStudentVerified',
      'username',
    ]);

    const posts = bodyOf<Page<Post>>(
      await client.get('/api/users/aziza/posts').expect(200),
    );
    expect(posts.items.map((p) => p.id)).toEqual([active.id]);

    const unknown = await client.get('/api/users/nobody').expect(404);
    expect(bodyOf(unknown)).toMatchObject({ errorCode: 'USER_NOT_FOUND' });
    await client.get('/api/users/nobody/posts').expect(404);
    // the profile pages need a login too
    await guestClient(ctx.app).get('/api/users/aziza').expect(401);
    await guestClient(ctx.app).get('/api/users/aziza/posts').expect(401);
  });

  it('the preferred language is saved in the profile', async () => {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const client = clientWithToken(ctx.app, aziza.id);
    expect(bodyOf(await client.get('/api/auth/me').expect(200))).toMatchObject({
      preferredLocale: 'EN',
    });
    expect(
      bodyOf(
        await client
          .patch('/api/users/me')
          .send({ preferredLocale: 'TG' })
          .expect(200),
      ),
    ).toMatchObject({ preferredLocale: 'TG' });
    expect(bodyOf(await client.get('/api/auth/me').expect(200))).toMatchObject({
      preferredLocale: 'TG',
    });
    await client
      .patch('/api/users/me')
      .send({ preferredLocale: 'FR' })
      .expect(400);
    await client
      .patch('/api/users/me')
      .send({ preferredLocale: 'RU', role: 'SUPER_ADMIN' })
      .expect(400);
    await guestClient(ctx.app)
      .patch('/api/users/me')
      .send({ preferredLocale: 'RU' })
      .expect(401);

    const registered = await guestClient(ctx.app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test12345',
        preferredLocale: 'RU',
      })
      .expect(201);
    expect(bodyOf(registered)).toMatchObject({ preferredLocale: 'RU' });
  });

  describe('university email → Student badge', () => {
    it('request → email in the user language with a link → verify → badge', async () => {
      const user = await createUser(ctx.prisma, {
        username: 'madina',
        preferredLocale: 'TG',
      });
      const client = clientWithToken(ctx.app, user.id);

      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'Madina@Students.University.TJ' })
        .expect(204);

      expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
      const sent = mail.sendVerificationEmail.mock.calls[0][0];
      expect(sent).toMatchObject({
        to: 'madina@students.university.tj',
        username: 'madina',
        locale: 'TG',
      });
      expect(sent.link).toMatch(
        /^http:\/\/localhost:3000\/tg\/settings\/verify-email\?token=[0-9a-f]{64}$/,
      );
      const token = new URL(sent.link).searchParams.get('token') as string;

      // the database holds only the hash
      const stored = await ctx.prisma.emailVerificationToken.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(stored.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
      expect(stored.tokenHash).not.toContain(token);

      // verifying needs the right account and the right token
      await guestClient(ctx.app)
        .post('/api/users/me/university-email/verify')
        .send({ token })
        .expect(401);
      const wrong = await client
        .post('/api/users/me/university-email/verify')
        .send({ token: 'a'.repeat(64) })
        .expect(400);
      expect(bodyOf(wrong)).toMatchObject({
        errorCode: 'VERIFICATION_TOKEN_INVALID',
      });
      const other = await createUser(ctx.prisma, { username: 'rustam' });
      await clientWithToken(ctx.app, other.id)
        .post('/api/users/me/university-email/verify')
        .send({ token })
        .expect(400);

      const verified = await client
        .post('/api/users/me/university-email/verify')
        .send({ token })
        .expect(200);
      expect(bodyOf(verified)).toMatchObject({
        isStudentVerified: true,
        universityEmail: 'madina@students.university.tj',
      });

      // the badge shows up on the profile and on her posts
      expect(
        bodyOf(await client.get('/api/users/madina').expect(200)),
      ).toMatchObject({ isStudentVerified: true });
      const post = bodyOf<{ author: { isStudentVerified: boolean } }>(
        await client.post('/api/posts').send(validPost).expect(201),
      );
      expect(post.author.isStudentVerified).toBe(true);

      // links work once; a verified student cannot start again
      const reuse = await client
        .post('/api/users/me/university-email/verify')
        .send({ token })
        .expect(409);
      expect(bodyOf(reuse)).toMatchObject({ errorCode: 'ALREADY_VERIFIED' });
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'again@university.tj' })
        .expect(409);
    });

    it('refuses other domains, taken addresses and expired links', async () => {
      const user = await createUser(ctx.prisma, { username: 'aziza' });
      await createUser(ctx.prisma, {
        username: 'madina',
        isStudentVerified: true,
        universityEmail: 'madina@students.university.tj',
      });
      const client = clientWithToken(ctx.app, user.id);

      const gmail = await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'aziza@gmail.com' })
        .expect(400);
      expect(bodyOf(gmail)).toMatchObject({
        errorCode: 'UNIVERSITY_DOMAIN_NOT_ALLOWED',
      });
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'aziza@evil-university.tj' })
        .expect(400);
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'not-an-email' })
        .expect(400);
      const taken = await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'madina@students.university.tj' })
        .expect(409);
      expect(bodyOf(taken)).toMatchObject({
        errorCode: 'UNIVERSITY_EMAIL_TAKEN',
      });
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();

      // a new request replaces the old link
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'aziza@university.tj' })
        .expect(204);
      const firstToken = new URL(
        mail.sendVerificationEmail.mock.calls[0][0].link,
      ).searchParams.get('token') as string;
      await client
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'aziza@university.tj' })
        .expect(204);
      const secondToken = new URL(
        mail.sendVerificationEmail.mock.calls[1][0].link,
      ).searchParams.get('token') as string;
      expect(
        await ctx.prisma.emailVerificationToken.count({
          where: { userId: user.id },
        }),
      ).toBe(1);
      await client
        .post('/api/users/me/university-email/verify')
        .send({ token: firstToken })
        .expect(400);

      // expired after 24 hours
      await ctx.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expired = await client
        .post('/api/users/me/university-email/verify')
        .send({ token: secondToken })
        .expect(400);
      expect(bodyOf(expired)).toMatchObject({
        errorCode: 'VERIFICATION_TOKEN_EXPIRED',
      });
      expect(
        (await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
          .isStudentVerified,
      ).toBe(false);
    });

    it('when the email cannot be sent: 502 MAIL_SEND_FAILED and no leftover link', async () => {
      const user = await createUser(ctx.prisma, { username: 'aziza' });
      mail.sendVerificationEmail.mockRejectedValue(new Error('Brevo is down'));
      const response = await clientWithToken(ctx.app, user.id)
        .post('/api/users/me/university-email')
        .send({ universityEmail: 'aziza@university.tj' });
      expect(response.status).toBe(500); // an unexpected error from the provider is hidden as INTERNAL_ERROR
      expect(bodyOf(response)).toMatchObject({ errorCode: 'INTERNAL_ERROR' });
      expect(JSON.stringify(response.body)).not.toContain('Brevo');
      expect(await ctx.prisma.emailVerificationToken.count()).toBe(0);
    });
  });
});
