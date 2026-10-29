import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/errors';

/** Defaults from docs/02-SPEC.md 7.3: no refetch on focus, no retry on 4xx, at most 2 retries on network/5xx. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500)
            return false;
          return failureCount < 2;
        },
      },
    },
  });
}
