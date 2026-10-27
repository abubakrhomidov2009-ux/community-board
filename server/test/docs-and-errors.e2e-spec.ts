import {
  bodyOf,
  createTestApp,
  guestClient,
  resetDatabase,
  TestContext,
} from './helpers';

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  security?: unknown[];
  parameters?: { name: string; in: string; description?: string }[];
  responses?: Record<
    string,
    { content?: Record<string, { schema?: unknown }> }
  >;
}
interface OpenApiDocument {
  paths: Record<string, Record<string, OpenApiOperation>>;
}

/** Every endpoint of docs/02-SPEC.md. If one is missing or renamed, the "Backend done" gate fails here. */
const EXPECTED_ENDPOINTS = [
  'GET /api/health',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'GET /api/auth/me',
  'PATCH /api/users/me',
  'GET /api/users/{username}',
  'GET /api/users/{username}/posts',
  'POST /api/users/me/university-email',
  'POST /api/users/me/university-email/verify',
  'GET /api/posts',
  'GET /api/posts/counts',
  'GET /api/posts/map',
  'GET /api/posts/mine',
  'GET /api/posts/{id}',
  'POST /api/posts',
  'PATCH /api/posts/{id}',
  'DELETE /api/posts/{id}',
  'POST /api/posts/{id}/resolve',
  'POST /api/posts/{id}/renew',
  'POST /api/posts/{id}/images',
  'DELETE /api/posts/{id}/images/{imageId}',
  'GET /api/posts/{postId}/comments',
  'POST /api/posts/{postId}/comments',
  'DELETE /api/comments/{id}',
  'GET /api/favorites',
  'PUT /api/posts/{id}/favorite',
  'DELETE /api/posts/{id}/favorite',
  'POST /api/posts/{id}/report',
  'GET /api/notifications',
  'GET /api/notifications/unread-count',
  'POST /api/notifications/{id}/read',
  'POST /api/notifications/read-all',
  'GET /api/conversations',
  'POST /api/conversations',
  'GET /api/conversations/{id}/messages',
  'POST /api/conversations/{id}/messages',
  'POST /api/conversations/{id}/read',
  'GET /api/admin/stats',
  'GET /api/admin/reports',
  'PATCH /api/admin/reports/{id}',
  'GET /api/admin/posts',
  'POST /api/admin/posts/{id}/remove',
  'POST /api/admin/posts/{id}/restore',
  'GET /api/admin/users',
  'POST /api/admin/users/{id}/block',
  'POST /api/admin/users/{id}/unblock',
];

describe('Health, error format and API documentation (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('basics', () => {
    it('GET /api/health returns ok', async () => {
      const response = await guestClient(ctx.app)
        .get('/api/health')
        .expect(200);
      expect(response.body).toEqual({ status: 'ok' });
    });

    it('sends security headers (helmet)', async () => {
      const response = await guestClient(ctx.app).get('/api/health');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('allows the frontend origin with credentials (CORS)', async () => {
      const response = await guestClient(ctx.app)
        .options('/api/posts')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not allow another origin (CORS)', async () => {
      const response = await guestClient(ctx.app)
        .get('/api/health')
        .set('Origin', 'https://evil.example');
      expect(response.headers['access-control-allow-origin']).not.toBe(
        'https://evil.example',
      );
    });
  });

  describe('one error format everywhere', () => {
    it('unknown route: 404 NOT_FOUND', async () => {
      const response = await guestClient(ctx.app)
        .get('/api/nothing-here')
        .expect(404);
      expect(bodyOf(response)).toMatchObject({
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        details: null,
      });
    });

    it('malformed JSON: 400 VALIDATION_FAILED', async () => {
      const response = await guestClient(ctx.app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ this is not json')
        .expect(400);
      expect(bodyOf(response)).toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_FAILED',
      });
    });

    it('validation errors list the failed fields and rules', async () => {
      const response = await guestClient(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', username: 'ab', password: '123' })
        .expect(400);
      const body = bodyOf<{
        errorCode: string;
        details: { field: string; code: string }[];
      }>(response);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      const fields = body.details.map((detail) => detail.field).sort();
      expect(fields).toEqual(
        expect.arrayContaining(['email', 'password', 'username']),
      );
      expect(
        body.details.every((detail) => typeof detail.code === 'string'),
      ).toBe(true);
    });

    it('unknown body fields are refused (nobody can send role: ADMIN)', async () => {
      const response = await guestClient(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'x@example.com',
          username: 'xuser',
          password: 'Test12345',
          role: 'ADMIN',
        })
        .expect(400);
      expect(bodyOf(response)).toMatchObject({
        errorCode: 'VALIDATION_FAILED',
      });
    });

    it('protected route without a login: 401 UNAUTHORIZED', async () => {
      const response = await guestClient(ctx.app)
        .get('/api/auth/me')
        .expect(401);
      expect(bodyOf(response)).toMatchObject({
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
      });
    });

    it('a garbage or forged cookie is not a login', async () => {
      await guestClient(ctx.app)
        .get('/api/auth/me')
        .set('Cookie', 'access_token=not.a.jwt')
        .expect(401);
    });
  });

  describe('Swagger (OpenAPI) quality gate', () => {
    let doc: OpenApiDocument;
    const operations: { key: string; op: OpenApiOperation }[] = [];

    beforeAll(async () => {
      const response = await guestClient(ctx.app)
        .get('/api/docs-json')
        .expect(200);
      doc = bodyOf<OpenApiDocument>(response);
      for (const [path, methods] of Object.entries(doc.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          operations.push({ key: `${method.toUpperCase()} ${path}`, op });
        }
      }
    });

    it('serves the Swagger page', async () => {
      const response = await guestClient(ctx.app).get('/api/docs').expect(200);
      expect(response.text).toContain('swagger');
    });

    it('documents every endpoint of the spec, and nothing else', () => {
      const actual = operations.map((operation) => operation.key).sort();
      expect(actual).toEqual([...EXPECTED_ENDPOINTS].sort());
    });

    it('every endpoint has a tag, a summary and a success response', () => {
      const problems = operations.filter(({ op }) => {
        const hasSuccess = Object.keys(op.responses ?? {}).some((code) =>
          code.startsWith('2'),
        );
        return (
          !op.tags?.length ||
          !op.summary ||
          op.summary.length < 8 ||
          !hasSuccess
        );
      });
      expect(problems.map((problem) => problem.key)).toEqual([]);
    });

    it('every endpoint that needs a login documents 401', () => {
      const problems = operations.filter(
        ({ op }) => op.security?.length && !op.responses?.['401'],
      );
      expect(problems.map((problem) => problem.key)).toEqual([]);
    });

    it('every error response uses the shared error DTO', () => {
      const problems: string[] = [];
      for (const { key, op } of operations) {
        for (const [code, response] of Object.entries(op.responses ?? {})) {
          if (
            Number(code) >= 400 &&
            !JSON.stringify(response).includes('ErrorResponseDto')
          ) {
            problems.push(`${key} ${code}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('every endpoint with a body or a result shows its shape (no undocumented shapes)', () => {
      const problems: string[] = [];
      for (const { key, op } of operations) {
        for (const [code, response] of Object.entries(op.responses ?? {})) {
          const isSuccessWithBody =
            (code === '200' || code === '201') && key !== 'GET /api/health';
          if (isSuccessWithBody && !response.content?.['application/json']) {
            problems.push(`${key} ${code}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('every path parameter has a description', () => {
      const problems: string[] = [];
      for (const { key, op } of operations) {
        for (const parameter of op.parameters ?? []) {
          if (parameter.in === 'path' && !parameter.description)
            problems.push(`${key} ${parameter.name}`);
        }
      }
      expect(problems).toEqual([]);
    });

    it('admin endpoints are marked as admin in their summary and need a login', () => {
      const admin = operations.filter(({ key }) => key.includes('/api/admin/'));
      expect(admin).toHaveLength(9);
      for (const { key, op } of admin) {
        expect({ key, marked: op.summary?.startsWith('(Admin)') }).toEqual({
          key,
          marked: true,
        });
        expect({ key, secured: Boolean(op.security?.length) }).toEqual({
          key,
          secured: true,
        });
        expect({ key, has403: Boolean(op.responses?.['403']) }).toEqual({
          key,
          has403: true,
        });
      }
    });

    it('the image upload documents multipart/form-data', () => {
      const upload = doc.paths['/api/posts/{id}/images']
        .post as OpenApiOperation & {
        requestBody?: { content?: Record<string, unknown> };
      };
      expect(Object.keys(upload.requestBody?.content ?? {})).toContain(
        'multipart/form-data',
      );
    });

    it('cookie login is configured for "Try it out"', () => {
      const secured = operations.filter(({ op }) => op.security?.length);
      expect(secured.length).toBeGreaterThan(20);
    });
  });
});
