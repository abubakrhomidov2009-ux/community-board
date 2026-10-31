'use client';

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type Query,
  type QueryClient,
} from '@tanstack/react-query';
import type { Post, PostPage } from '@/features/posts/api';
import { postKeys } from '@/features/posts/queries';
import { saveFavorite, unsaveFavorite } from './api';
import { favoriteKeys } from './queries';

type Lists = InfiniteData<PostPage>;

/** Every cached list of slips (board, Saved, My profile, someone's profile): they all show the same heart. */
const isSlipList = (query: Query) =>
  ['posts', 'users', 'favorites'].includes(String(query.queryKey[0])) &&
  Array.isArray((query.state.data as Lists | undefined)?.pages);

function setHeart(queryClient: QueryClient, id: string, save: boolean) {
  queryClient.setQueriesData<Lists>({ predicate: isSlipList }, (data) =>
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
  const detail = queryClient.getQueryData<Post>(postKeys.detail(id));
  if (detail) queryClient.setQueryData(postKeys.detail(id), { ...detail, isFavorite: save });
}

/**
 * The heart on a slip. The heart changes at once (optimistic) and goes back if the server says no.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, save }: { id: string; save: boolean }) =>
      save ? saveFavorite(id) : unsaveFavorite(id),
    onMutate: async ({ id, save }) => {
      await queryClient.cancelQueries({ predicate: isSlipList });
      const before = queryClient.getQueriesData<Lists>({ predicate: isSlipList });
      const detail = queryClient.getQueryData<Post>(postKeys.detail(id));
      setHeart(queryClient, id, save);
      return { before, detail, id };
    },
    onError: (_error, _vars, context) => {
      context?.before.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.detail) queryClient.setQueryData(postKeys.detail(context.id), context.detail);
    },
    onSuccess: () => {
      // The Saved page must list the new set the next time it opens.
      void queryClient.invalidateQueries({ queryKey: favoriteKeys.all, refetchType: 'none' });
    },
  });
}
