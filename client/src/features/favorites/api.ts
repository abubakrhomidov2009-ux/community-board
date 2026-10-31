import { api } from '@/lib/api/axios';

export const saveFavorite = (postId: string) =>
  api.put(`/posts/${postId}/favorite`).then(() => undefined);

export const unsaveFavorite = (postId: string) =>
  api.delete(`/posts/${postId}/favorite`).then(() => undefined);

import type { PostPage } from '@/features/posts/api';

export const FAVORITES_PAGE_SIZE = 12;

export const listFavorites = (page: number) =>
  api
    .get<PostPage>('/favorites', { params: { page, limit: FAVORITES_PAGE_SIZE } })
    .then((response) => response.data);
