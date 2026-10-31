import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

export type Notification = components['schemas']['NotificationResponseDto'];
export type NotificationPage = components['schemas']['PaginatedNotificationsResponseDto'];

export const NOTIFICATIONS_PAGE_SIZE = 20;

export const fetchUnreadCount = () =>
  api.get<{ count: number }>('/notifications/unread-count').then((response) => response.data.count);

export const listNotifications = (page: number) =>
  api
    .get<NotificationPage>('/notifications', { params: { page, limit: NOTIFICATIONS_PAGE_SIZE } })
    .then((r) => r.data);

export const markRead = (id: string) => api.post(`/notifications/${id}/read`).then(() => undefined);

export const markAllRead = () => api.post('/notifications/read-all').then(() => undefined);
