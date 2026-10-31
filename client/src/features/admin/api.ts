import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

type S = components['schemas'];
export type AdminStats = S['AdminStatsResponseDto'];
export type AdminReport = S['AdminReportResponseDto'];
export type AdminReportPage = S['PaginatedAdminReportsResponseDto'];
export type AdminPost = S['AdminPostResponseDto'];
export type AdminPostPage = S['PaginatedAdminPostsResponseDto'];
export type AdminPostDetail = S['AdminPostDetailResponseDto'];
export type AdminUser = S['AdminUserResponseDto'];
export type AdminUserPage = S['PaginatedAdminUsersResponseDto'];
export type AdminUserDetail = S['AdminUserDetailResponseDto'];
export type Role = AdminUser['role'];
export type ReportStatus = AdminReport['status'];
export type PostStatus = AdminPost['status'];

export const ADMIN_PAGE_SIZE = 15;

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);

export const fetchStats = () => get<AdminStats>('/admin/stats');
export const listReports = (page: number, status?: ReportStatus) =>
  get<AdminReportPage>('/admin/reports', { page, limit: ADMIN_PAGE_SIZE, status });
export const dismissReport = (id: string) =>
  api.patch(`/admin/reports/${id}`, { status: 'DISMISSED' }).then(() => undefined);
export const listAdminPosts = (page: number, q?: string, status?: PostStatus) =>
  get<AdminPostPage>('/admin/posts', { page, limit: ADMIN_PAGE_SIZE, q: q || undefined, status });
export const getAdminPost = (id: string) => get<AdminPostDetail>(`/admin/posts/${id}`);
export const removePost = (id: string, reason?: string) =>
  api.patch(`/admin/posts/${id}/remove`, { reason: reason || undefined }).then(() => undefined);
export const restorePost = (id: string) =>
  api.patch(`/admin/posts/${id}/restore`).then(() => undefined);
export const dismissPostReports = (id: string) =>
  api.patch(`/admin/posts/${id}/reports/dismiss`).then(() => undefined);
export const listAdminUsers = (
  page: number,
  q?: string,
  role?: 'USER' | 'ADMIN',
  isBlocked?: boolean,
) =>
  get<AdminUserPage>('/admin/users', {
    page,
    limit: ADMIN_PAGE_SIZE,
    q: q || undefined,
    role,
    isBlocked,
  });
export const getAdminUser = (id: string) => get<AdminUserDetail>(`/admin/users/${id}`);
export const userAction = (id: string, action: 'block' | 'unblock' | 'promote' | 'demote') =>
  api.patch(`/admin/users/${id}/${action}`).then(() => undefined);
