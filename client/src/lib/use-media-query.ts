'use client';

import { useSyncExternalStore } from 'react';

/** True while the screen matches the query (for example '(min-width: 768px)'). False on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
