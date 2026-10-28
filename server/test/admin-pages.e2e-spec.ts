import { Role } from '@prisma/client';
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
}
interface PostPage {
  id: string;
  status: string;
  description: string;
  images: unknown[];
  reports: {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    reporter: { id: string; username: string };
  }[];
  author: {
    id: string;
    username: string;
    email: string;
    role: string;
    isStudentVerified: boolean;
    postsCount: number;
    reportsOnPostsCount: number;
  };
}
interface UserPage {
  id: string;
  email: string;
  username: string;
  role: string;
  isBlocked: boolean;
  counts: {
    posts: number;
    reportsOnPosts: number;
    comments: number;
    removedPosts: number;
  };
  posts: {
    id: string;
    title: string;
    status: string;
    openReportsCount: number;
  }[];
}
interface Report {
  post: { author: { id: string } };
  reporter: { id: string; username: string };
}

describe('Admin post page and admin user page (e2e)', () => {
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

  async function setup() {
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const author = await createUser(ctx.prisma, {
      username: 'rustam',
      isStudentVerified: true,
    });
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const madina = await createUser(ctx.prisma, { username: 'madina' });
    const authorClient = clientWithToken(ctx.app, author.id);
    const post = bodyOf<Post>(
      await authorClient.post('/api/posts').send(validPost).expect(201),
    );
    const second = bodyOf<Post>(
      await authorClient
        .post('/api/posts')
        .send({ ...validPost, title: 'Second post of rustam' })
        .expect(201),
    );
    await clientWithToken(ctx.app, aziza.id)
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SPAM', details: 'Posted again and again' })
      .expect(201);
    await clientWithToken(ctx.app, madina.id)
      .post(`/api/posts/${post.id}/report`)
      .send({ reason: 'SCAM' })
      .expect(201);
    await clientWithToken(ctx.app, aziza.id)
      .post(`/api/posts/${post.id}/comments`)
      .send({ body: 'Is this real?' })
      .expect(201);
    return {
      admin,
      author,
      aziza,
      madina,
      post,
      second,
      adminClient: clientWithToken(ctx.app, admin.id),
    };
  }

  describe('GET /api/admin/posts/:id', () => {
    it('returns the post, every report with who reported, and a summary of the author', async () => {
      const { adminClient, post, author, aziza } = await setup();
      const page = bodyOf<PostPage>(
        await adminClient.get(`/api/admin/posts/${post.id}`).expect(200),
      );
      expect(page).toMatchObject({
        id: post.id,
        status: 'ACTIVE',
        description: validPost.description,
      });
      expect(page.images).toEqual([]);
      expect(page.reports).toHaveLength(2);
      expect(page.reports.map((r) => r.reason).sort()).toEqual([
        'SCAM',
        'SPAM',
      ]);
      const spam = page.reports.find((r) => r.reason === 'SPAM');
      expect(spam).toMatchObject({
        details: 'Posted again and again',
        status: 'OPEN',
        reporter: { id: aziza.id, username: 'aziza' },
      });
      expect(page.author).toMatchObject({
        id: author.id,
        username: 'rustam',
        email: 'rustam@example.com',
        role: 'USER',
        isStudentVerified: true,
        postsCount: 2,
        reportsOnPostsCount: 2,
      });
      expect(JSON.stringify(page)).not.toContain('passwordHash');
    });

    it('also works for removed posts', async () => {
      const { adminClient, post } = await setup();
      await adminClient
        .patch(`/api/admin/posts/${post.id}/remove`)
        .send({ reason: 'Spam' })
        .expect(200);
      const page = bodyOf<PostPage>(
        await adminClient.get(`/api/admin/posts/${post.id}`).expect(200),
      );
      expect(page.status).toBe('REMOVED');
      // removing closed the open reports
      expect(page.reports.every((r) => r.status === 'RESOLVED')).toBe(true);
    });

    it('404 for an unknown post; 403 for users; 401 for guests', async () => {
      const { adminClient, post, aziza } = await setup();
      const missing = await adminClient
        .get('/api/admin/posts/unknown')
        .expect(404);
      expect(bodyOf(missing)).toMatchObject({ errorCode: 'POST_NOT_FOUND' });
      await clientWithToken(ctx.app, aziza.id)
        .get(`/api/admin/posts/${post.id}`)
        .expect(403);
      await guestClient(ctx.app).get(`/api/admin/posts/${post.id}`).expect(401);
    });
  });

  describe('PATCH /api/admin/posts/:id/reports/dismiss', () => {
    it('dismisses all open reports, keeps the post, and returns the updated page', async () => {
      const { adminClient, post } = await setup();
      const page = bodyOf<PostPage>(
        await adminClient
          .patch(`/api/admin/posts/${post.id}/reports/dismiss`)
          .expect(200),
      );
      expect(page.status).toBe('ACTIVE');
      expect(page.reports).toHaveLength(2);
      expect(page.reports.every((r) => r.status === 'DISMISSED')).toBe(true);

      // nothing left to review
      const open = bodyOf<{ total: number }>(
        await adminClient.get('/api/admin/reports?status=OPEN').expect(200),
      );
      expect(open.total).toBe(0);
      // doing it again is fine
      await adminClient
        .patch(`/api/admin/posts/${post.id}/reports/dismiss`)
        .expect(200);
    });

    it('404 for an unknown post; 403 for users; 401 for guests', async () => {
      const { adminClient, post, aziza } = await setup();
      await adminClient
        .patch('/api/admin/posts/unknown/reports/dismiss')
        .expect(404);
      await clientWithToken(ctx.app, aziza.id)
        .patch(`/api/admin/posts/${post.id}/reports/dismiss`)
        .expect(403);
      await guestClient(ctx.app)
        .patch(`/api/admin/posts/${post.id}/reports/dismiss`)
        .expect(401);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('returns the user, the counts and their posts', async () => {
      const { adminClient, author, post, second } = await setup();
      // one removed post
      await adminClient
        .patch(`/api/admin/posts/${second.id}/remove`)
        .send({})
        .expect(200);

      const page = bodyOf<UserPage>(
        await adminClient.get(`/api/admin/users/${author.id}`).expect(200),
      );
      expect(page).toMatchObject({
        id: author.id,
        username: 'rustam',
        email: 'rustam@example.com',
        role: 'USER',
        isBlocked: false,
      });
      expect(page.counts).toEqual({
        posts: 2,
        reportsOnPosts: 2,
        comments: 0,
        removedPosts: 1,
      });
      expect(page.posts).toHaveLength(2);
      const reported = page.posts.find((p) => p.id === post.id);
      expect(reported).toMatchObject({ status: 'ACTIVE', openReportsCount: 2 });
      expect(page.posts.find((p) => p.id === second.id)?.status).toBe(
        'REMOVED',
      );
      expect(JSON.stringify(page)).not.toContain('passwordHash');
    });

    it('counts comments, and shows an empty list for a user without posts', async () => {
      const { adminClient, aziza } = await setup();
      const page = bodyOf<UserPage>(
        await adminClient.get(`/api/admin/users/${aziza.id}`).expect(200),
      );
      expect(page.counts).toEqual({
        posts: 0,
        reportsOnPosts: 0,
        comments: 1,
        removedPosts: 0,
      });
      expect(page.posts).toEqual([]);
    });

    it('404 for an unknown user; 403 for users; 401 for guests', async () => {
      const { adminClient, author, aziza } = await setup();
      const missing = await adminClient
        .get('/api/admin/users/unknown')
        .expect(404);
      expect(bodyOf(missing)).toMatchObject({ errorCode: 'USER_NOT_FOUND' });
      await clientWithToken(ctx.app, aziza.id)
        .get(`/api/admin/users/${author.id}`)
        .expect(403);
      await guestClient(ctx.app)
        .get(`/api/admin/users/${author.id}`)
        .expect(401);
    });
  });

  describe('the admin lists carry user ids so names can link to the admin user page', () => {
    it('reports list: reporter id and author id; posts list: author id', async () => {
      const { adminClient, author, aziza } = await setup();
      const reports = bodyOf<{ items: Report[] }>(
        await adminClient.get('/api/admin/reports').expect(200),
      );
      expect(reports.items.some((r) => r.reporter.id === aziza.id)).toBe(true);
      expect(reports.items.every((r) => r.post.author.id === author.id)).toBe(
        true,
      );
      const posts = bodyOf<{
        items: { author: { id: string; username: string } }[];
      }>(await adminClient.get('/api/admin/posts').expect(200));
      expect(posts.items.every((p) => p.author.id === author.id)).toBe(true);
    });
  });
});
