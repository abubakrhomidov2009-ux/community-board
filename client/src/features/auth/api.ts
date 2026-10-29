import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

export type User = components['schemas']['UserResponseDto'];
export type LoginBody = components['schemas']['LoginDto'];
export type RegisterBody = components['schemas']['RegisterDto'];

// The auth calls never try to refresh the login themselves (a wrong password must stay a plain 401).
export const login = (body: LoginBody) =>
  api.post<User>('/auth/login', body, { skipAuthRefresh: true }).then((response) => response.data);

export const register = (body: RegisterBody) =>
  api
    .post<User>('/auth/register', body, { skipAuthRefresh: true })
    .then((response) => response.data);

export const logout = () =>
  api.post('/auth/logout', undefined, { skipAuthRefresh: true }).then(() => undefined);

/** The logged-in user. On 401 the Axios interceptor renews the login once before this fails. */
export const fetchMe = () => api.get<User>('/auth/me').then((response) => response.data);
