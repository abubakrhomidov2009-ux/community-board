import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { api, setSessionExpiredHandler } from './axios';
import { ApiError, toApiError } from './errors';

type Reply = { status: number; data?: unknown };

/** Replaces the network: every call is answered by `handler`. Returns the list of calls made. */
function fakeServer(handler: (config: InternalAxiosRequestConfig, call: number) => Reply) {
  const calls: string[] = [];
  const adapter: AxiosAdapter = (config) => {
    calls.push(`${config.method?.toUpperCase()} ${config.url}`);
    const reply = handler(config, calls.length);
    const response = {
      data: reply.data ?? null,
      status: reply.status,
      statusText: '',
      headers: {},
      config,
    };
    return reply.status < 400
      ? Promise.resolve(response)
      : Promise.reject(
          Object.assign(new Error('failed'), { isAxiosError: true, config, response }),
        );
  };
  api.defaults.adapter = adapter;
  return calls;
}

const unauthorized = {
  status: 401,
  data: { statusCode: 401, errorCode: 'UNAUTHORIZED', message: 'x', details: null },
};
const refreshInvalid = {
  status: 401,
  data: { statusCode: 401, errorCode: 'REFRESH_TOKEN_INVALID', message: 'x', details: null },
};

afterEach(() => setSessionExpiredHandler(null));

describe('error handling', () => {
  it('turns the backend error format into an ApiError', async () => {
    fakeServer(() => ({
      status: 409,
      data: { statusCode: 409, errorCode: 'EMAIL_TAKEN', message: 'x', details: null },
    }));
    const error = await api.post('/auth/register').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 409, errorCode: 'EMAIL_TAKEN' });
  });

  it('knows a network failure (no answer at all)', () => {
    expect(
      toApiError(Object.assign(new Error('Network Error'), { isAxiosError: true })),
    ).toMatchObject({
      statusCode: 0,
      errorCode: 'NETWORK_ERROR',
    });
    expect(toApiError(new Error('boom'))).toMatchObject({ errorCode: 'UNKNOWN' });
  });
});

describe('silent login renewal on 401', () => {
  it('renews the login once and repeats the request', async () => {
    let meCalls = 0;
    const calls = fakeServer((config) => {
      if (config.url === '/auth/refresh') return { status: 200, data: { id: 'u1' } };
      meCalls += 1;
      return meCalls === 1 ? unauthorized : { status: 200, data: { id: 'u1' } };
    });
    const response = await api.get('/auth/me');
    expect(response.data).toEqual({ id: 'u1' });
    expect(calls).toEqual(['GET /auth/me', 'POST /auth/refresh', 'GET /auth/me']);
  });

  it('shares one renewal between requests that fail at the same time', async () => {
    const seen: Record<string, number> = {};
    const calls = fakeServer((config) => {
      if (config.url === '/auth/refresh') return { status: 200 };
      const key = config.url ?? '';
      seen[key] = (seen[key] ?? 0) + 1;
      return seen[key] === 1 ? unauthorized : { status: 200, data: key };
    });
    const [a, b, c] = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect([a.data, b.data, c.data]).toEqual(['/a', '/b', '/c']);
    expect(calls.filter((call) => call === 'POST /auth/refresh')).toHaveLength(1);
  });

  it('tells the app when the login cannot be renewed, and does not loop', async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    const calls = fakeServer((config) =>
      config.url === '/auth/refresh' ? refreshInvalid : unauthorized,
    );
    await expect(api.get('/auth/me')).rejects.toMatchObject({ errorCode: 'REFRESH_TOKEN_INVALID' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['GET /auth/me', 'POST /auth/refresh']);
  });

  it('does not try to renew for calls that opt out (a wrong password must stay a plain 401)', async () => {
    const calls = fakeServer(() => ({
      status: 401,
      data: { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'x', details: null },
    }));
    await expect(api.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toMatchObject({
      errorCode: 'INVALID_CREDENTIALS',
    });
    expect(calls).toEqual(['POST /auth/login']);
  });

  it('does not renew for other errors (403, 404, 500)', async () => {
    const calls = fakeServer(() => ({
      status: 403,
      data: { statusCode: 403, errorCode: 'USER_BLOCKED', message: 'x', details: null },
    }));
    await expect(api.get('/posts')).rejects.toMatchObject({ errorCode: 'USER_BLOCKED' });
    expect(calls).toEqual(['GET /posts']);
  });
});
