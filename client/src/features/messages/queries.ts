'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/features/notifications/queries';
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startConversation,
} from './api';

export const messageKeys = {
  conversations: ['conversations'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
};

/** My conversations, checked every 15 seconds while the page is open. */
export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations,
    queryFn: () => listConversations(),
    refetchInterval: 15_000,
  });
}

/** The messages of one chat, checked every 5 seconds while it is open. */
export function useMessages(id: string) {
  return useQuery({
    queryKey: messageKeys.messages(id),
    queryFn: () => listMessages(id),
    refetchInterval: 5_000,
  });
}

export function useSendMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.messages(id) });
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ to, body }: { to: string; body: string }) => startConversation(to, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: messageKeys.conversations }),
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markConversationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
