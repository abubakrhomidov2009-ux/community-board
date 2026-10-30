'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchUnreadCount } from './api';

/** The number on the bell. Checked every minute while the page is open; only for logged-in people. */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: 60_000,
  });
}
