'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchMapPins, fetchPostCounts, getPost, listPosts, type PostFilters } from './api';

export const postKeys = {
  all: ['posts'] as const,
  lists: ['posts', 'list'] as const,
  detail: (id: string) => ['posts', 'detail', id] as const,
  mine: ['posts', 'mine'] as const,
  list: (filters: PostFilters) => ['posts', 'list', filters] as const,
  counts: (filters: PostFilters) =>
    [
      'posts',
      'counts',
      { q: filters.q, district: filters.district, min: filters.minPrice, max: filters.maxPrice },
    ] as const,
};

/** The board: pages of slips, "Show more slips" asks for the next page. */
export function usePostsInfinite(filters: PostFilters) {
  return useInfiniteQuery({
    queryKey: postKeys.list(filters),
    queryFn: ({ pageParam }) => listPosts(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function usePostCounts(filters: PostFilters) {
  return useQuery({
    queryKey: postKeys.counts(filters),
    queryFn: () => fetchPostCounts(filters),
    placeholderData: keepPreviousData,
  });
}

/** One post for the detail and edit pages. A 404 (POST_NOT_FOUND) is not retried. */
export function usePost(id: string, enabled = true) {
  return useQuery({ queryKey: postKeys.detail(id), queryFn: () => getPost(id), enabled });
}

export function useMapPins(filters: PostFilters, enabled: boolean) {
  return useQuery({
    queryKey: [
      'posts',
      'map',
      filters.q,
      filters.category,
      filters.district,
      filters.minPrice,
      filters.maxPrice,
    ],
    queryFn: () => fetchMapPins(filters),
    enabled,
  });
}
