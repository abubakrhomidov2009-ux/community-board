'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUnreadCount, listNotifications, markAllRead, markRead } from './api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread-count'] as const,
};

/** The number on the bell. Checked every minute while the page is open; only for logged-in people. */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkRead() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: markRead, onSuccess: refresh });
}

export function useMarkAllRead() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: markAllRead, onSuccess: refresh });
}
