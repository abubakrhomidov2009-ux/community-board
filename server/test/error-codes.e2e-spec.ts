import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Role } from '@prisma/client';
import { ErrorCode } from '../src/common/error-code';
import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  resetDatabase,
  TestContext,
  validPost,
} from './helpers';

describe('Error codes: every code of docs/02-SPEC.md is real (e2e)', () => {
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

  it('the error-code table in the spec lists exactly the codes of the backend', () => {
    const spec = readFileSync(
      join(__dirname, '..', '..', 'docs', '02-SPEC.md'),
      'utf8',
    );
    const table = spec.slice(
      spec.indexOf('### 4.2 Error codes'),
      spec.indexOf('### 4.3 Endpoints'),
    );
    const inSpec = [...table.matchAll(/^\|\s*([A-Z_]+)\s*\|\s*\d{3}\s*\|/gm)]
      .map((match) => match[1])
      .sort();
    expect(inSpec).toEqual(Object.values(ErrorCode).sort());
  });

  it('COMMENT_NOT_FOUND and COMMENT_NOT_OWNER', async () => {
    const author = await createUser(ctx.prisma, { username: 'rustam' });
    const other = await createUser(ctx.prisma, { username: 'aziza' });
    const authorClient = clientWithToken(ctx.app, author.id);
    const post = bodyOf<{ id: string }>(
      await authorClient.post('/api/posts').send(validPost).expect(201),
    );
    const comment = bodyOf<{ id: string }>(
      await authorClient
        .post(`/api/posts/${post.id}/comments`)
        .send({ body: 'My own comment' })
        .expect(201),
    );

    const missing = await authorClient
      .delete('/api/comments/unknown')
      .expect(404);
    expect(bodyOf(missing)).toMatchObject({ errorCode: 'COMMENT_NOT_FOUND' });

    const notOwner = await clientWithToken(ctx.app, other.id)
      .delete(`/api/comments/${comment.id}`)
      .expect(403);
    expect(bodyOf(notOwner)).toMatchObject({ errorCode: 'COMMENT_NOT_OWNER' });
  });

  it('IMAGE_NOT_FOUND', async () => {
    const user = await createUser(ctx.prisma, { username: 'aziza' });
    const client = clientWithToken(ctx.app, user.id);
    const post = bodyOf<{ id: string }>(
      await client.post('/api/posts').send(validPost).expect(201),
    );
    const response = await client
      .delete(`/api/posts/${post.id}/images/unknown`)
      .expect(404);
    expect(bodyOf(response)).toMatchObject({ errorCode: 'IMAGE_NOT_FOUND' });
  });

  it('REPORT_NOT_FOUND', async () => {
    const admin = await createUser(ctx.prisma, {
      username: 'admin',
      role: Role.ADMIN,
    });
    const response = await clientWithToken(ctx.app, admin.id)
      .patch('/api/admin/reports/unknown')
      .send({ status: 'DISMISSED' })
      .expect(404);
    expect(bodyOf(response)).toMatchObject({ errorCode: 'REPORT_NOT_FOUND' });
  });

  it('NOTIFICATION_NOT_FOUND', async () => {
    const user = await createUser(ctx.prisma, { username: 'aziza' });
    const response = await clientWithToken(ctx.app, user.id)
      .post('/api/notifications/unknown/read')
      .expect(404);
    expect(bodyOf(response)).toMatchObject({
      errorCode: 'NOTIFICATION_NOT_FOUND',
    });
  });
});
