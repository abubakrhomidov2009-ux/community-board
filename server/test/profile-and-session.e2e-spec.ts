import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from '../src/modules/uploads/cloudinary.service';
import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  guestClient,
  PASSWORD,
  resetDatabase,
  TestContext,
  validPost,
} from './helpers';

interface Me {
  id: string;
  username: string;
  role: string;
  avatarUrl: string | null;
  preferredLocale: string;
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(50),
]);

/** Reads one cookie value out of the Set-Cookie headers of a response. */
function cookieValue(
  response: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const list = (response.headers['set-cookie'] ?? []) as string[];
  const line = list.find((entry) => entry.startsWith(`${name}=`));
  return line?.split(';')[0].slice(name.length + 1);
}

function setCookieLine(
  response: { headers: Record<string, unknown> },
  name: string,
): string {
  const list = (response.headers['set-cookie'] ?? []) as string[];
  return list.find((entry) => entry.startsWith(`${name}=`)) ?? '';
}

describe('Profile, sessions (refresh token) and login-only access (e2e)', () => {
  let ctx: TestContext;
  let counter = 0;
  const cloudinary = {
    isConfigured: () => true,
    upload: jest.fn((_buffer: Buffer, _kind?: string) => {
      counter += 1;
      return Promise.resolve({
        url: `https://res.cloudinary.com/test/image/upload/avatar-${counter}.jpg`,
        publicId: `test/avatar-${counter}`,
      });
    }),
    destroyMany: jest.fn((_ids: string[]) => Promise.resolve()),
  };

  beforeAll(async () => {
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(CloudinaryService).useValue(cloudinary),
    );
  });

  beforeEach(async () => {
    counter = 0;
    cloudinary.upload.mockClear();
    cloudinary.destroyMany.mockClear();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const login = (emailOrUsername: string, password = PASSWORD) =>
    guestClient(ctx.app)
      .post('/api/auth/login')
      .send({ emailOrUsername, password });

  describe('login-only access', () => {
    it('guests get 401 on every posts, comments and users endpoint; health stays public', async () => {
      const guest = guestClient(ctx.app);
      for (const path of [
        '/api/posts',
        '/api/posts/counts',
        '/api/posts/map',
        '/api/posts/someid',
        '/api/posts/someid/comments',
        '/api/users/aziza',
        '/api/users/aziza/posts',
      ]) {
        const response = await guest.get(path).expect(401);
        expect(bodyOf(response)).toMatchObject({ errorCode: 'UNAUTHORIZED' });
      }
      await guest.get('/api/health').expect(200);
    });

    it('a logged-in user can read all of them', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      const client = clientWithToken(ctx.app, aziza.id);
      const post = bodyOf<{ id: string }>(
        await client.post('/api/posts').send(validPost).expect(201),
      );
      for (const path of [
        '/api/posts',
        '/api/posts/counts',
        '/api/posts/map',
        `/api/posts/${post.id}`,
        `/api/posts/${post.id}/comments`,
        '/api/users/aziza',
        '/api/users/aziza/posts',
      ]) {
        await client.get(path).expect(200);
      }
    });
  });

  describe('refresh token', () => {
    it('login sets a short access cookie and a refresh cookie that is only sent to /api/auth', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const response = await login('aziza').expect(200);
      expect(cookieValue(response, 'access_token')).toBeTruthy();
      expect(cookieValue(response, 'refresh_token')).toBeTruthy();
      const refreshLine = setCookieLine(response, 'refresh_token');
      expect(refreshLine).toContain('HttpOnly');
      expect(refreshLine).toContain('Path=/api/auth');
      expect(setCookieLine(response, 'access_token')).toContain('HttpOnly');
      expect(JSON.stringify(response.body)).not.toContain(
        cookieValue(response, 'refresh_token'),
      );

      // only a hash is stored
      const stored = await ctx.prisma.refreshToken.findFirstOrThrow();
      expect(stored.tokenHash).not.toBe(cookieValue(response, 'refresh_token'));
      expect(stored.tokenHash).toHaveLength(64);
    });

    it('an expired login token is renewed with the refresh token, and the old refresh token is replaced', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      const loggedIn = await login('aziza').expect(200);
      const refresh1 = cookieValue(loggedIn, 'refresh_token') as string;

      // the login token ran out
      const expired = ctx.app
        .get(JwtService)
        .sign({ sub: aziza.id }, { expiresIn: '-10s' });
      const guest = guestClient(ctx.app);
      const denied = await guest
        .get('/api/auth/me')
        .set('Cookie', `access_token=${expired}`)
        .expect(401);
      expect(bodyOf(denied)).toMatchObject({ errorCode: 'UNAUTHORIZED' });

      // refresh gives a new pair
      const refreshed = await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh1}`)
        .expect(200);
      expect(bodyOf<Me>(refreshed)).toMatchObject({ username: 'aziza' });
      const access2 = cookieValue(refreshed, 'access_token') as string;
      const refresh2 = cookieValue(refreshed, 'refresh_token') as string;
      expect(refresh2).toBeTruthy();
      expect(refresh2).not.toBe(refresh1);
      await guestClient(ctx.app)
        .get('/api/auth/me')
        .set('Cookie', `access_token=${access2}`)
        .expect(200);

      // the new refresh token works again
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh2}`)
        .expect(200);
    });

    it('refuses a missing, unknown or expired refresh token (REFRESH_TOKEN_INVALID)', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const noCookie = await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .expect(401);
      expect(bodyOf(noCookie)).toMatchObject({
        errorCode: 'REFRESH_TOKEN_INVALID',
      });
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=nonsense')
        .expect(401);

      const loggedIn = await login('aziza').expect(200);
      const refresh = cookieValue(loggedIn, 'refresh_token') as string;
      await ctx.prisma.refreshToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh}`)
        .expect(401);
    });

    it('a token that was already replaced and comes back later closes every session (stolen-token protection)', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const loggedIn = await login('aziza').expect(200);
      const refresh1 = cookieValue(loggedIn, 'refresh_token') as string;
      const refreshed = await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh1}`)
        .expect(200);
      const refresh2 = cookieValue(refreshed, 'refresh_token') as string;

      // a moment later (two tabs at once) the old one still works...
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh1}`)
        .expect(200);

      // ...but later it looks stolen
      await ctx.prisma.refreshToken.updateMany({
        where: { rotatedAt: { not: null } },
        data: { rotatedAt: new Date(Date.now() - 60_000) },
      });
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh1}`)
        .expect(401);
      // and the newest token is closed too
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh2}`)
        .expect(401);
      expect(
        await ctx.prisma.refreshToken.count({ where: { revokedAt: null } }),
      ).toBe(0);
    });

    it('logout ends the session: the refresh token stops working and both cookies are cleared', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const loggedIn = await login('aziza').expect(200);
      const refresh = cookieValue(loggedIn, 'refresh_token') as string;

      const out = await guestClient(ctx.app)
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${refresh}`)
        .expect(204);
      expect(setCookieLine(out, 'refresh_token')).toContain('Path=/api/auth');
      expect(cookieValue(out, 'refresh_token')).toBe('');
      expect(cookieValue(out, 'access_token')).toBe('');

      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh}`)
        .expect(401);
      // logging out twice, or when not logged in, is fine
      await guestClient(ctx.app).post('/api/auth/logout').expect(204);
    });

    it('a blocked user cannot refresh (USER_BLOCKED) and loses all sessions', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      const loggedIn = await login('aziza').expect(200);
      const refresh = cookieValue(loggedIn, 'refresh_token') as string;
      await ctx.prisma.user.update({
        where: { id: aziza.id },
        data: { isBlocked: true },
      });
      const response = await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh}`)
        .expect(403);
      expect(bodyOf(response)).toMatchObject({ errorCode: 'USER_BLOCKED' });
      expect(
        await ctx.prisma.refreshToken.count({ where: { revokedAt: null } }),
      ).toBe(0);
    });

    it('register also starts a session with a refresh token', async () => {
      const response = await guestClient(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test12345',
        })
        .expect(201);
      expect(cookieValue(response, 'refresh_token')).toBeTruthy();
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set(
          'Cookie',
          `refresh_token=${cookieValue(response, 'refresh_token')}`,
        )
        .expect(200);
    });
  });

  describe('change password', () => {
    it('needs the current password, saves the new one, and logs the other devices out', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const phone = await login('aziza').expect(200);
      const phoneRefresh = cookieValue(phone, 'refresh_token') as string;

      // this device (the laptop) is an agent that keeps its cookies
      const laptop = guestClient(ctx.app);
      await laptop
        .post('/api/auth/login')
        .send({ emailOrUsername: 'aziza', password: PASSWORD })
        .expect(200);

      const wrong = await laptop
        .post('/api/auth/change-password')
        .send({ currentPassword: 'Wrong12345', newPassword: 'NewPass6789' })
        .expect(400);
      expect(bodyOf(wrong)).toMatchObject({
        errorCode: 'CURRENT_PASSWORD_INCORRECT',
      });

      await laptop
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: 'short' })
        .expect(400);
      await laptop
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: 'onlyletters' })
        .expect(400);
      const same = await laptop
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD })
        .expect(400);
      expect(bodyOf(same)).toMatchObject({
        errorCode: 'VALIDATION_FAILED',
        details: [{ field: 'newPassword', code: 'isDifferent' }],
      });
      await guestClient(ctx.app)
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: 'NewPass6789' })
        .expect(401);

      const changed = await laptop
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: 'NewPass6789' })
        .expect(200);
      expect(JSON.stringify(changed.body)).not.toMatch(/password/i);

      // the laptop stays logged in with its new cookies
      await laptop.get('/api/auth/me').expect(200);
      // the phone is logged out
      await guestClient(ctx.app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${phoneRefresh}`)
        .expect(401);
      // the old password is gone, the new one works
      await login('aziza', PASSWORD).expect(401);
      await login('aziza', 'NewPass6789').expect(200);
    });
  });

  describe('edit profile', () => {
    it('changes the username (saved lowercase) and the old name stops working', async () => {
      await createUser(ctx.prisma, { username: 'aziza' });
      const client = guestClient(ctx.app);
      await client
        .post('/api/auth/login')
        .send({ emailOrUsername: 'aziza', password: PASSWORD })
        .expect(200);

      const changed = await client
        .patch('/api/users/me')
        .send({ username: 'Aziza_New' })
        .expect(200);
      expect(bodyOf<Me>(changed).username).toBe('aziza_new');
      expect(
        bodyOf<Me>(await client.get('/api/auth/me').expect(200)),
      ).toMatchObject({ username: 'aziza_new' });
      await client.get('/api/users/aziza_new').expect(200);
      await client.get('/api/users/aziza').expect(404);
      await login('aziza').expect(401);
      await login('aziza_new').expect(200);
    });

    it('can change the username and the language together, or send only one field', async () => {
      const user = await createUser(ctx.prisma, { username: 'aziza' });
      const client = clientWithToken(ctx.app, user.id);
      const both = await client
        .patch('/api/users/me')
        .send({ username: 'aziza2', preferredLocale: 'TG' })
        .expect(200);
      expect(bodyOf<Me>(both)).toMatchObject({
        username: 'aziza2',
        preferredLocale: 'TG',
      });
      const onlyLanguage = await client
        .patch('/api/users/me')
        .send({ preferredLocale: 'RU' })
        .expect(200);
      expect(bodyOf<Me>(onlyLanguage)).toMatchObject({
        username: 'aziza2',
        preferredLocale: 'RU',
      });
      // sending my own name again is fine
      await client
        .patch('/api/users/me')
        .send({ username: 'aziza2' })
        .expect(200);
    });

    it('refuses a name that is taken (USERNAME_TAKEN), a bad name, and any role', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      await createUser(ctx.prisma, { username: 'rustam' });
      const client = clientWithToken(ctx.app, aziza.id);

      const taken = await client
        .patch('/api/users/me')
        .send({ username: 'RUSTAM' })
        .expect(409);
      expect(bodyOf(taken)).toMatchObject({ errorCode: 'USERNAME_TAKEN' });

      for (const username of ['ab', 'has space', 'x'.repeat(21), 'bad-name!']) {
        const response = await client
          .patch('/api/users/me')
          .send({ username })
          .expect(400);
        expect(bodyOf(response)).toMatchObject({
          errorCode: 'VALIDATION_FAILED',
        });
      }
      for (const role of ['ADMIN', 'SUPER_ADMIN']) {
        await client.patch('/api/users/me').send({ role }).expect(400);
      }
      await guestClient(ctx.app)
        .patch('/api/users/me')
        .send({ username: 'whatever' })
        .expect(401);
      expect(
        bodyOf<Me>(await client.get('/api/auth/me').expect(200)),
      ).toMatchObject({ username: 'aziza', role: 'USER' });
    });
  });

  describe('profile picture', () => {
    const upload = (
      client: ReturnType<typeof clientWithToken>,
      data: Buffer,
      type = 'image/png',
    ) =>
      client
        .post('/api/users/me/avatar')
        .attach('file', data, { filename: 'me.png', contentType: type });

    it('sets, replaces and removes the picture, and cleans up Cloudinary', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      await createUser(ctx.prisma, { username: 'rustam' });
      const client = clientWithToken(ctx.app, aziza.id);

      const first = await upload(client, PNG).expect(200);
      expect(bodyOf<Me>(first).avatarUrl).toBe(
        'https://res.cloudinary.com/test/image/upload/avatar-1.jpg',
      );
      expect(cloudinary.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        'avatar',
      );
      expect(cloudinary.destroyMany).not.toHaveBeenCalled();

      // other users see it on the public profile, and /me shows it too
      const rustam = clientWithToken(
        ctx.app,
        (
          await ctx.prisma.user.findUniqueOrThrow({
            where: { username: 'rustam' },
          })
        ).id,
      );
      expect(
        bodyOf<{ avatarUrl: string }>(
          await rustam.get('/api/users/aziza').expect(200),
        ).avatarUrl,
      ).toContain('avatar-1.jpg');
      expect(
        bodyOf<Me>(await client.get('/api/auth/me').expect(200)).avatarUrl,
      ).toContain('avatar-1.jpg');

      // a new picture replaces the old one and deletes it
      const second = await upload(client, PNG).expect(200);
      expect(bodyOf<Me>(second).avatarUrl).toContain('avatar-2.jpg');
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['test/avatar-1']);

      // removing it
      await client.delete('/api/users/me/avatar').expect(204);
      expect(cloudinary.destroyMany).toHaveBeenLastCalledWith([
        'test/avatar-2',
      ]);
      expect(
        bodyOf<Me>(await client.get('/api/auth/me').expect(200)).avatarUrl,
      ).toBeNull();
      // removing again is fine and deletes nothing more
      cloudinary.destroyMany.mockClear();
      await client.delete('/api/users/me/avatar').expect(204);
      expect(cloudinary.destroyMany).not.toHaveBeenCalled();
    });

    it('refuses no file, a wrong file type, a fake image and a file over 5 MB; guests get 401', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      const client = clientWithToken(ctx.app, aziza.id);

      const none = await client.post('/api/users/me/avatar').expect(400);
      expect(bodyOf(none)).toMatchObject({ errorCode: 'VALIDATION_FAILED' });
      const pdf = await upload(client, PNG, 'application/pdf').expect(400);
      expect(bodyOf(pdf)).toMatchObject({ errorCode: 'IMAGE_TYPE_INVALID' });
      const fake = await upload(
        client,
        Buffer.from('this is text, not a picture'),
      ).expect(400);
      expect(bodyOf(fake)).toMatchObject({ errorCode: 'IMAGE_TYPE_INVALID' });
      const big = await upload(
        client,
        Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]),
      ).expect(413);
      expect(bodyOf(big)).toMatchObject({ errorCode: 'IMAGE_TOO_LARGE' });
      expect(cloudinary.upload).not.toHaveBeenCalled();

      await guestClient(ctx.app)
        .post('/api/users/me/avatar')
        .attach('file', PNG, { filename: 'me.png', contentType: 'image/png' })
        .expect(401);
      await guestClient(ctx.app).delete('/api/users/me/avatar').expect(401);
    });

    it('answers UPLOAD_FAILED when Cloudinary is down and keeps the old picture', async () => {
      const aziza = await createUser(ctx.prisma, { username: 'aziza' });
      const client = clientWithToken(ctx.app, aziza.id);
      await upload(client, PNG).expect(200);
      cloudinary.upload.mockRejectedValueOnce(new Error('Cloudinary is down'));
      const failed = await upload(client, PNG).expect(502);
      expect(bodyOf(failed)).toMatchObject({ errorCode: 'UPLOAD_FAILED' });
      expect(
        bodyOf<Me>(await client.get('/api/auth/me').expect(200)).avatarUrl,
      ).toContain('avatar-1.jpg');
    });
  });
});
