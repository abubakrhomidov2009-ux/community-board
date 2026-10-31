'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getPublicUser, listMyPosts, listUserPosts } from './api';

export const userKeys = {
  profile: (username: string) => ['users', username] as const,
  posts: (username: string) => ['users', username, 'posts'] as const,
  mine: (status: string) => ['posts', 'mine', status] as const,
};

export function usePublicUser(username: string) {
  return useQuery({ queryKey: userKeys.profile(username), queryFn: () => getPublicUser(username) });
}

export function useUserPosts(username: string) {
  return useInfiniteQuery({
    queryKey: userKeys.posts(username),
    queryFn: ({ pageParam }) => listUserPosts(username, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export function useMyPosts(status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED' | 'REMOVED') {
  return useInfiniteQuery({
    queryKey: userKeys.mine(status),
    queryFn: ({ pageParam }) => listMyPosts(status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}
