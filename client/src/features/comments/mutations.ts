'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postKeys } from '@/features/posts/queries';
import { addComment, deleteComment } from './api';
import { commentKeys } from './queries';

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(postId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      void queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      void queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}
