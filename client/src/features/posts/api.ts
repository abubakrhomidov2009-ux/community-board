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
