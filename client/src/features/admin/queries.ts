'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dismissPostReports,
  dismissReport,
  fetchStats,
  getAdminPost,
  getAdminUser,
  listAdminPosts,
  listAdminUsers,
  listReports,
  removePost,
  restorePost,
  userAction,
  type PostStatus,
  type ReportStatus,
} from './api';

const keep = { placeholderData: keepPreviousData };

export const useAdminStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats });

export const useAdminReports = (page: number, status?: ReportStatus) =>
  useQuery({
    queryKey: ['admin', 'reports', page, status],
    queryFn: () => listReports(page, status),
    ...keep,
  });

export const useAdminPosts = (page: number, q: string, status?: PostStatus) =>
  useQuery({
    queryKey: ['admin', 'posts', page, q, status],
    queryFn: () => listAdminPosts(page, q, status),
    ...keep,
  });

export const useAdminPost = (id: string) =>
  useQuery({ queryKey: ['admin', 'post', id], queryFn: () => getAdminPost(id) });

export const useAdminUsers = (
  page: number,
  q: string,
  role?: 'USER' | 'ADMIN',
  blocked?: boolean,
) =>
  useQuery({
    queryKey: ['admin', 'users', page, q, role, blocked],
    queryFn: () => listAdminUsers(page, q, role, blocked),
    ...keep,
  });

export const useAdminUser = (id: string) =>
  useQuery({ queryKey: ['admin', 'user', id], queryFn: () => getAdminUser(id) });

/** Everything an admin changes also changes the board, so all admin screens and the public lists refresh. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
  };
}

export function useRemovePost(id: string) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (reason?: string) => removePost(id, reason),
    onSuccess: refresh,
  });
}
export function useRestorePost(id: string) {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: () => restorePost(id), onSuccess: refresh });
}
export function useDismissPostReports(id: string) {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: () => dismissPostReports(id), onSuccess: refresh });
}
export function useDismissReport() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => dismissReport(id), onSuccess: refresh });
}
export function useUserAction(id: string) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (action: 'block' | 'unblock' | 'promote' | 'demote') => userAction(id, action),
    onSuccess: refresh,
  });
}
