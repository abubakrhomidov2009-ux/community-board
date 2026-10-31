'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPost,
  deleteImage,
  deletePost,
  renewPost,
  resolvePost,
  updatePost,
  uploadImages,
  type CreatePostBody,
  type Post,
  type UpdatePostBody,
} from './api';
import { postKeys } from './queries';

/** After any change to a post, the board and the post page must show the new truth. */
function useRefreshPosts() {
  const queryClient = useQueryClient();
  return (post?: Post) => {
    if (post) queryClient.setQueryData(postKeys.detail(post.id), post);
    void queryClient.invalidateQueries({ queryKey: postKeys.lists });
    void queryClient.invalidateQueries({ queryKey: ['posts', 'counts'] });
    void queryClient.invalidateQueries({ queryKey: postKeys.mine });
  };
}

export function useCreatePost() {
  const refresh = useRefreshPosts();
  return useMutation({
    mutationFn: (body: CreatePostBody) => createPost(body),
    onSuccess: (post) => refresh(post),
  });
}

export function useUpdatePost(id: string) {
  const refresh = useRefreshPosts();
  return useMutation({
    mutationFn: (body: UpdatePostBody) => updatePost(id, body),
    onSuccess: (post) => refresh(post),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const refresh = useRefreshPosts();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      refresh();
    },
  });
}

export function useResolvePost() {
  const refresh = useRefreshPosts();
  return useMutation({ mutationFn: (id: string) => resolvePost(id), onSuccess: refresh });
}

export function useRenewPost() {
  const refresh = useRefreshPosts();
  return useMutation({ mutationFn: (id: string) => renewPost(id), onSuccess: refresh });
}

export function useUploadImages(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPosts();
  return useMutation({
    mutationFn: (files: File[]) => uploadImages(id, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      refresh();
    },
  });
}

export function useDeleteImage(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPosts();
  return useMutation({
    mutationFn: (imageId: string) => deleteImage(id, imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      refresh();
    },
  });
}
