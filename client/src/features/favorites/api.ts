import { api } from '@/lib/api/axios';

export const saveFavorite = (postId: string) =>
  api.put(`/posts/${postId}/favorite`).then(() => undefined);

export const unsaveFavorite = (postId: string) =>
  api.delete(`/posts/${postId}/favorite`).then(() => undefined);
