import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

export type Comment = components['schemas']['CommentResponseDto'];
export type CommentPage = components['schemas']['PaginatedCommentsResponseDto'];

export const COMMENTS_PAGE_SIZE = 20;

export const listComments = (postId: string, page: number) =>
  api
    .get<CommentPage>(`/posts/${postId}/comments`, { params: { page, limit: COMMENTS_PAGE_SIZE } })
    .then((response) => response.data);

export const addComment = (postId: string, body: string) =>
  api.post<Comment>(`/posts/${postId}/comments`, { body }).then((response) => response.data);

export const deleteComment = (id: string) => api.delete(`/comments/${id}`).then(() => undefined);
