import { Role } from '@prisma/client';
import { ensureSuperAdmin } from '../src/modules/admin/super-admin';
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

interface AdminUser {
  id: string;
  username: string;
  role: string;
  isBlocked: boolean;
}
interface Post {
  id: string;
  status: string;
}

describe('Roles: USER, ADMIN and the one SUPER_ADMIN (e2e)', () => {
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

  /** The same cast of characters in every test. */
  async function cast() {
    const owner = await createUser(ctx.prisma, {
      username: 'owner',
      role: Role.SUPER_ADMIN,
    });
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const admin2 = await createUser(ctx.prisma, {
      username: 'admin2',
      role: Role.ADMIN,
    });
    const user = await createUser(ctx.prisma, { username: 'aziza' });
    return {
      owner,
      admin,
      admin2,
      user,
      ownerClient: clientWithToken(ctx.app, owner.id),
      adminClient: clientWithToken(ctx.app, admin.id),
      admin2Client: clientWithToken(ctx.app, admin2.id),
      userClient: clientWithToken(ctx.app, user.id),
    };
  }

  const postBy = async (userId: string) =>
    bodyOf<Post>(
      await clientWithToken(ctx.app, userId)
        .post('/api/posts')
        .send(validPost)
        .expect(201),
    );

  describe('nobody can pick a role', () => {
    it('register and edit-profile refuse a role field, and new accounts are USER', async () => {
      for (const role of ['ADMIN', 'SUPER_ADMIN', 'USER']) {
        await guestClient(ctx.app)
          .post('/api/auth/register')
          .send({
            email: `x${role}@example.com`,
            username: `x${role.toLowerCase()}`,
            password: PASSWORD,
            role,
          })
          .expect(400);
      }
      const registered = await guestClient(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'ok@example.com',
          username: 'okuser',
          password: PASSWORD,
        })
        .expect(201);
      expect(bodyOf<AdminUser>(registered).role).toBe('USER');

      const { userClient } = await cast();
      await userClient
        .patch('/api/users/me')
        .send({ role: 'SUPER_ADMIN' })
        .expect(400);
    });
  });

  describe('USER', () => {
    it('can use the site but not the admin panel or the role endpoints (ADMIN_ONLY / FORBIDDEN_ROLE)', async () => {
      const { userClient, admin } = await cast();
      await userClient.post('/api/posts').send(validPost).expect(201);
      for (const path of [
        '/api/admin/stats',
        '/api/admin/users',
        `/api/admin/users/${admin.id}`,
      ]) {
        const response = await userClient.get(path).expect(403);
        expect(bodyOf(response)).toMatchObject({ errorCode: 'ADMIN_ONLY' });
      }
      for (const action of ['block', 'unblock']) {
        await userClient
          .patch(`/api/admin/users/${admin.id}/${action}`)
          .expect(403);
      }
      for (const action of ['promote', 'demote']) {
        const response = await userClient
          .patch(`/api/admin/users/${admin.id}/${action}`)
          .expect(403);
        expect(bodyOf(response)).toMatchObject({ errorCode: 'FORBIDDEN_ROLE' });
      }
    });
  });

  describe('ADMIN', () => {
    it('can use the admin panel and block, unblock and moderate normal users', async () => {
      const { adminClient, user } = await cast();
      await adminClient.get('/api/admin/stats').expect(200);
      const post = await postBy(user.id);

      expect(
        bodyOf<AdminUser>(
          await adminClient
            .patch(`/api/admin/users/${user.id}/block`)
            .expect(200),
        ),
      ).toMatchObject({ isBlocked: true });
      expect(
        bodyOf<AdminUser>(
          await adminClient
            .patch(`/api/admin/users/${user.id}/unblock`)
            .expect(200),
        ),
      ).toMatchObject({ isBlocked: false });
      await adminClient
        .patch(`/api/admin/posts/${post.id}/remove`)
        .send({ reason: 'Spam' })
        .expect(200);
      await adminClient
        .patch(`/api/admin/posts/${post.id}/restore`)
        .expect(200);
    });

    it('cannot promote or demote anybody (FORBIDDEN_ROLE)', async () => {
      const { adminClient, admin2, user, owner } = await cast();
      for (const target of [admin2, user, owner]) {
        for (const action of ['promote', 'demote']) {
          const response = await adminClient
            .patch(`/api/admin/users/${target.id}/${action}`)
            .expect(403);
          expect(bodyOf(response)).toMatchObject({
            errorCode: 'FORBIDDEN_ROLE',
          });
        }
      }
      expect(
        (await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
          .role,
      ).toBe(Role.USER);
    });

    it('cannot block, unblock or touch the posts of another admin, or of themselves (FORBIDDEN_ROLE)', async () => {
      const { adminClient, admin, admin2 } = await cast();
      const post = await postBy(admin2.id);
      for (const target of [admin2, admin]) {
        for (const action of ['block', 'unblock']) {
          const response = await adminClient
            .patch(`/api/admin/users/${target.id}/${action}`)
            .expect(403);
          expect(bodyOf(response)).toMatchObject({
            errorCode: 'FORBIDDEN_ROLE',
          });
        }
      }
      for (const action of ['remove', 'restore', 'reports/dismiss']) {
        const response = await adminClient
          .patch(`/api/admin/posts/${post.id}/${action}`)
          .send({})
          .expect(403);
        expect(bodyOf(response)).toMatchObject({ errorCode: 'FORBIDDEN_ROLE' });
      }
      expect(
        (await ctx.prisma.user.findUniqueOrThrow({ where: { id: admin2.id } }))
          .isBlocked,
      ).toBe(false);
      expect(
        (await ctx.prisma.post.findUniqueOrThrow({ where: { id: post.id } }))
          .status,
      ).toBe('ACTIVE');
    });

    it('cannot touch the super admin or the posts of the super admin (CANNOT_CHANGE_SUPER_ADMIN)', async () => {
      const { adminClient, owner } = await cast();
      const post = await postBy(owner.id);
      for (const action of ['block', 'unblock', 'promote', 'demote']) {
        const response = await adminClient
          .patch(`/api/admin/users/${owner.id}/${action}`)
          .expect(403);
        // promote/demote are super-admin-only endpoints, so an admin is stopped earlier
        expect(['CANNOT_CHANGE_SUPER_ADMIN', 'FORBIDDEN_ROLE']).toContain(
          bodyOf<{ errorCode: string }>(response).errorCode,
        );
      }
      const removed = await adminClient
        .patch(`/api/admin/posts/${post.id}/remove`)
        .send({})
        .expect(403);
      expect(bodyOf(removed)).toMatchObject({
        errorCode: 'CANNOT_CHANGE_SUPER_ADMIN',
      });
      expect(
        (await ctx.prisma.user.findUniqueOrThrow({ where: { id: owner.id } }))
          .isBlocked,
      ).toBe(false);
    });

    it('a blocked admin loses the admin panel (USER_BLOCKED)', async () => {
      const { ownerClient, adminClient, admin } = await cast();
      await ownerClient.patch(`/api/admin/users/${admin.id}/block`).expect(200);
      const response = await adminClient.get('/api/admin/stats').expect(403);
      expect(bodyOf(response)).toMatchObject({ errorCode: 'USER_BLOCKED' });
    });
  });

  describe('SUPER_ADMIN', () => {
    it('can do everything an admin can', async () => {
      const { ownerClient, user } = await cast();
      await ownerClient.get('/api/admin/stats').expect(200);
      const post = await postBy(user.id);
      await ownerClient
        .patch(`/api/admin/posts/${post.id}/remove`)
        .send({})
        .expect(200);
      await ownerClient
        .patch(`/api/admin/posts/${post.id}/restore`)
        .expect(200);
      await ownerClient.patch(`/api/admin/users/${user.id}/block`).expect(200);
      await ownerClient
        .patch(`/api/admin/users/${user.id}/unblock`)
        .expect(200);
    });

    it('promotes a user to ADMIN (works at once), and cannot promote an admin again (USER_ALREADY_ADMIN)', async () => {
      const { ownerClient, userClient, user, admin } = await cast();
      await userClient.get('/api/admin/stats').expect(403);

      const promoted = await ownerClient
        .patch(`/api/admin/users/${user.id}/promote`)
        .expect(200);
      expect(bodyOf<AdminUser>(promoted)).toMatchObject({
        role: 'ADMIN',
        username: 'aziza',
      });
      await userClient.get('/api/admin/stats').expect(200);

      const again = await ownerClient
        .patch(`/api/admin/users/${admin.id}/promote`)
        .expect(409);
      expect(bodyOf(again)).toMatchObject({ errorCode: 'USER_ALREADY_ADMIN' });
    });

    it('demotes an admin to USER (access ends at once), and cannot demote a normal user (USER_NOT_ADMIN)', async () => {
      const { ownerClient, adminClient, admin, user } = await cast();
      await adminClient.get('/api/admin/stats').expect(200);

      const demoted = await ownerClient
        .patch(`/api/admin/users/${admin.id}/demote`)
        .expect(200);
      expect(bodyOf<AdminUser>(demoted)).toMatchObject({ role: 'USER' });
      await adminClient.get('/api/admin/stats').expect(403);

      const notAdmin = await ownerClient
        .patch(`/api/admin/users/${user.id}/demote`)
        .expect(409);
      expect(bodyOf(notAdmin)).toMatchObject({ errorCode: 'USER_NOT_ADMIN' });
    });

    it('can block and unblock an admin, and moderate the posts of an admin', async () => {
      const { ownerClient, admin2 } = await cast();
      const post = await postBy(admin2.id);
      expect(
        bodyOf<AdminUser>(
          await ownerClient
            .patch(`/api/admin/users/${admin2.id}/block`)
            .expect(200),
        ),
      ).toMatchObject({ isBlocked: true });
      await ownerClient
        .patch(`/api/admin/users/${admin2.id}/unblock`)
        .expect(200);
      await ownerClient
        .patch(`/api/admin/posts/${post.id}/remove`)
        .send({})
        .expect(200);
    });

    it('nobody can change the super admin, not even the super admin (CANNOT_CHANGE_SUPER_ADMIN)', async () => {
      const { ownerClient, owner } = await cast();
      for (const action of ['block', 'unblock', 'promote', 'demote']) {
        const response = await ownerClient
          .patch(`/api/admin/users/${owner.id}/${action}`)
          .expect(403);
        expect(bodyOf(response)).toMatchObject({
          errorCode: 'CANNOT_CHANGE_SUPER_ADMIN',
        });
      }
      const after = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: owner.id },
      });
      expect(after).toMatchObject({ role: Role.SUPER_ADMIN, isBlocked: false });
    });

    it('unknown users give 404', async () => {
      const { ownerClient } = await cast();
      for (const action of ['promote', 'demote', 'block', 'unblock']) {
        await ownerClient
          .patch(`/api/admin/users/unknown/${action}`)
          .expect(404);
      }
    });
  });

  describe('users list role filter', () => {
    it('?role=USER shows normal users, ?role=ADMIN shows admins and the super admin', async () => {
      const { adminClient } = await cast();
      const names = async (query: string) =>
        bodyOf<{ items: AdminUser[] }>(
          await adminClient.get(`/api/admin/users?${query}`).expect(200),
        )
          .items.map((item) => item.username)
          .sort();
      expect(await names('role=USER')).toEqual(['aziza']);
      expect(await names('role=ADMIN')).toEqual(['admin', 'admin2', 'owner']);
      expect(await names('')).toHaveLength(4);
      await adminClient.get('/api/admin/users?role=SUPER_ADMIN').expect(400);
    });
  });

  describe('the one and only super admin (from SUPER_ADMIN_EMAIL)', () => {
    it('creates the account when it does not exist', async () => {
      await expect(
        ensureSuperAdmin(ctx.prisma, {
          email: 'Owner@Example.com',
          password: 'Owner12345',
          resetPassword: false,
        }),
      ).resolves.toBe('created');
      const owner = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: 'owner@example.com' },
      });
      expect(owner).toMatchObject({
        role: Role.SUPER_ADMIN,
        username: 'superadmin',
      });
      // the password works
      await guestClient(ctx.app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'owner@example.com', password: 'Owner12345' })
        .expect(200);
    });

    it('upgrades an existing account, unblocks it, and keeps its password unless asked to reset', async () => {
      const existing = await createUser(ctx.prisma, {
        username: 'owner',
        isBlocked: true,
      });
      await expect(
        ensureSuperAdmin(ctx.prisma, {
          email: 'owner@example.com',
          password: 'Different123',
          resetPassword: false,
        }),
      ).resolves.toBe('upgraded');
      expect(
        await ctx.prisma.user.findUniqueOrThrow({ where: { id: existing.id } }),
      ).toMatchObject({ role: Role.SUPER_ADMIN, isBlocked: false });
      await guestClient(ctx.app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'owner', password: PASSWORD })
        .expect(200);

      // nothing to do the second time
      await expect(
        ensureSuperAdmin(ctx.prisma, {
          email: 'owner@example.com',
          password: 'Different123',
          resetPassword: false,
        }),
      ).resolves.toBe('unchanged');

      // the seed resets the password to the one in server/.env
      await ensureSuperAdmin(ctx.prisma, {
        email: 'owner@example.com',
        password: 'Different123',
        resetPassword: true,
      });
      await guestClient(ctx.app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'owner', password: 'Different123' })
        .expect(200);
    });

    it('there is exactly one: another super admin becomes a normal admin', async () => {
      const old = await createUser(ctx.prisma, {
        username: 'old',
        role: Role.SUPER_ADMIN,
      });
      await createUser(ctx.prisma, { username: 'owner' });
      await ensureSuperAdmin(ctx.prisma, {
        email: 'owner@example.com',
        password: 'Owner12345',
        resetPassword: false,
      });
      expect(
        await ctx.prisma.user.count({ where: { role: Role.SUPER_ADMIN } }),
      ).toBe(1);
      expect(
        (await ctx.prisma.user.findUniqueOrThrow({ where: { id: old.id } }))
          .role,
      ).toBe(Role.ADMIN);
    });

    it('picks a free username when "superadmin" is taken', async () => {
      await createUser(ctx.prisma, { username: 'superadmin' });
      await ensureSuperAdmin(ctx.prisma, {
        email: 'boss@example.com',
        password: 'Owner12345',
        resetPassword: false,
      });
      expect(
        (
          await ctx.prisma.user.findUniqueOrThrow({
            where: { email: 'boss@example.com' },
          })
        ).username,
      ).toBe('superadmin1');
    });
  });
});
