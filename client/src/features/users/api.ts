import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';
import type { PostPage } from '@/features/posts/api';

export type PublicUser = components['schemas']['PublicUserResponseDto'];
export type UpdateMeBody = components['schemas']['UpdateMeDto'];
export type ChangePasswordBody = components['schemas']['ChangePasswordDto'];
export type User = components['schemas']['UserResponseDto'];
type Status = 'ACTIVE' | 'RESOLVED' | 'EXPIRED' | 'REMOVED';

export const PROFILE_PAGE_SIZE = 12;

export const getPublicUser = (username: string) =>
  api.get<PublicUser>(`/users/${encodeURIComponent(username)}`).then((r) => r.data);

export const listUserPosts = (username: string, page: number) =>
  api
    .get<PostPage>(`/users/${encodeURIComponent(username)}/posts`, {
      params: { page, limit: PROFILE_PAGE_SIZE },
    })
    .then((r) => r.data);

/** My own posts, any status (the profile tabs). */
export const listMyPosts = (status: Status, page: number) =>
  api
    .get<PostPage>('/posts/mine', { params: { status, page, limit: PROFILE_PAGE_SIZE } })
    .then((r) => r.data);

export const updateMe = (body: UpdateMeBody) =>
  api.patch<User>('/users/me', body).then((r) => r.data);

export const changePassword = (body: ChangePasswordBody) =>
  api.post<User>('/auth/change-password', body).then((r) => r.data);

export const uploadAvatar = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api
    .post<User>('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};

/** The backend answers 204 (no body): the page sets avatarUrl to null itself. */
export const removeAvatar = () => api.delete('/users/me/avatar').then(() => undefined);

export const requestUniversityEmail = (universityEmail: string) =>
  api.post('/users/me/university-email', { universityEmail }).then(() => undefined);

export const verifyUniversityEmail = (token: string) =>
  api.post<User>('/users/me/university-email/verify', { token }).then((r) => r.data);
