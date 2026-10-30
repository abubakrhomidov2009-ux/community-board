import { api } from '@/lib/api/axios';

export const fetchUnreadCount = () =>
  api.get<{ count: number }>('/notifications/unread-count').then((response) => response.data.count);
