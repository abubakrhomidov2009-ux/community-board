import { api } from '@/lib/api/axios';
import type { components, operations } from '@/lib/api/schema';

export type Post = components['schemas']['PostResponseDto'];
export type PostPage = components['schemas']['PaginatedPostsResponseDto'];
export type PostCounts = components['schemas']['PostCountsResponseDto'];
export type Category = Post['category'];
export type District = Post['district'];
export type PostSort = NonNullable<
  NonNullable<operations['PostsController_list']['parameters']['query']>['sort']
>;

export const CATEGORIES: Category[] = ['LOST_FOUND', 'TUTORING', 'RENTALS', 'OTHER'];
export const DISTRICTS: District[] = [
  'UNIVERSITY_CAMPUS',
  'SINO',
  'FIRDAVSI',
  'SHOHMANSUR',
  'ISMOILI_SOMONI',
  'OTHER',
];
export const SORTS: PostSort[] = ['newest', 'oldest', 'price_asc', 'price_desc'];

/** What the board filters on. Everything is optional; this object is also kept in the page address. */
export interface PostFilters {
  q?: string;
  category?: Category;
  district?: District;
  minPrice?: number;
  maxPrice?: number;
  sort: PostSort;
}

export const PAGE_SIZE = 12;

export const listPosts = (filters: PostFilters, page: number) =>
  api
    .get<PostPage>('/posts', { params: { ...filters, page, limit: PAGE_SIZE } })
    .then((response) => response.data);

/** Counts ignore the chosen category (they fill the category tabs). */
export const fetchPostCounts = (filters: PostFilters) => {
  const { q, district, minPrice, maxPrice } = filters;
  return api
    .get<PostCounts>('/posts/counts', { params: { q, district, minPrice, maxPrice } })
    .then((response) => response.data);
};

export type CreatePostBody = components['schemas']['CreatePostDto'];
export type UpdatePostBody = components['schemas']['UpdatePostDto'];
export type PriceUnit = NonNullable<Post['priceUnit']>;

export const getPost = (id: string) =>
  api.get<Post>(`/posts/${id}`).then((response) => response.data);

export const createPost = (body: CreatePostBody) =>
  api.post<Post>('/posts', body).then((response) => response.data);

export const updatePost = (id: string, body: UpdatePostBody) =>
  api.patch<Post>(`/posts/${id}`, body).then((response) => response.data);

export const deletePost = (id: string) => api.delete(`/posts/${id}`).then(() => undefined);

export const resolvePost = (id: string) =>
  api.post<Post>(`/posts/${id}/resolve`).then((response) => response.data);

export const renewPost = (id: string) =>
  api.post<Post>(`/posts/${id}/renew`).then((response) => response.data);

/** Photos go to the backend as multipart (field "files"); the backend sends them to Cloudinary. */
export const uploadImages = (id: string, files: File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return api
    .post<Post['images']>(`/posts/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((response) => response.data);
};

export const deleteImage = (id: string, imageId: string) =>
  api.delete(`/posts/${id}/images/${imageId}`).then(() => undefined);
