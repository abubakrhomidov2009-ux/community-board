import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

export type Conversation = components['schemas']['ConversationResponseDto'];
export type ConversationPage = components['schemas']['PaginatedConversationsResponseDto'];
export type Message = components['schemas']['MessageResponseDto'];

export const listConversations = (page = 1) =>
  api.get<ConversationPage>('/conversations', { params: { page, limit: 30 } }).then((r) => r.data);

export const startConversation = (recipientUsername: string, body: string) =>
  api.post<Conversation>('/conversations', { recipientUsername, body }).then((r) => r.data);

/** The newest 50 messages, oldest first. */
export const listMessages = (id: string) =>
  api
    .get<Message[]>(`/conversations/${id}/messages`, { params: { limit: 50 } })
    .then((r) => r.data);

export const sendMessage = (id: string, body: string) =>
  api.post<Message>(`/conversations/${id}/messages`, { body }).then((r) => r.data);

export const markConversationRead = (id: string) =>
  api.post(`/conversations/${id}/read`).then(() => undefined);
