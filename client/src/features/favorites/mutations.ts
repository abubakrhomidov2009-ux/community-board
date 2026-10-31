'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { postKeys } from '@/features/posts/queries';
import type { Post, PostPage } from '@/features/posts/api';
import { saveFavorite, unsaveFavorite } from './api';

type Lists = InfiniteData<PostPage>;

/**
 * The heart on a slip. The heart changes at once (optimistic) and goes back if the server says no.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, save }: { id: string; save: boolean }) =>
      save ? saveFavorite(id) : unsaveFavorite(id),
    onMutate: async ({ id, save }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.lists });
      const before = queryClient.getQueriesData<Lists>({ queryKey: postKeys.lists });
      queryClient.setQueriesData<Lists>({ queryKey: postKeys.lists }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((post) =>
                  post.id === id ? { ...post, isFavorite: save } : post,
                ),
              })),
            }
          : data,
      );
      // The post page shows the same heart.
      const detailKey = postKeys.detail(id);
      const detail = queryClient.getQueryData<Post>(detailKey);
      if (detail) queryClient.setQueryData(detailKey, { ...detail, isFavorite: save });
      return { before, detail, id };
    },
    onError: (_error, _vars, context) => {
      context?.before.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.detail) queryClient.setQueryData(postKeys.detail(context.id), context.detail);
    },
  });
}
