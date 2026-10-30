'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { PostFilters } from './api';
import { parseFilters, serializeFilters } from './filters';

/** The board filters live in the page address, so a link or a refresh keeps them. */
export function useBoardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(query)), [query]);

  // Two changes in a row (a click right after the search box fires) must not undo each other.
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);

  const update = useCallback(
    (patch: Partial<PostFilters>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      const qs = serializeFilters(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const clear = useCallback(() => {
    latest.current = { sort: 'newest' };
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { filters, update, clear };
}
