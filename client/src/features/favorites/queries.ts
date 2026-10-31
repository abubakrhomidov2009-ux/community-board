'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listFavorites } from './api';

export const favoriteKeys = {
  all: ['favorites'] as const,
  list: ['favorites', 'list'] as const,
};

/** My saved slips, newest save first; "Show more" loads the next page. */
export function useFavorites() {
  return useInfiniteQuery({
    queryKey: favoriteKeys.list,
    queryFn: ({ pageParam }) => listFavorites(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}
