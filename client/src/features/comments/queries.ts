'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listComments } from './api';

export const commentKeys = {
  list: (postId: string) => ['comments', postId] as const,
};

/** Oldest first; "Show earlier/more notes" loads the next page. */
export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: commentKeys.list(postId),
    queryFn: ({ pageParam }) => listComments(postId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}
