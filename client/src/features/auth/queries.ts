'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useSyncExternalStore } from 'react';
import { hasSessionHint, subscribeSessionHint } from '@/lib/session-hint';
import { fetchMe, type User } from './api';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/** What the server saw in the "has a login" hint cookie, so the first paint is already right. */
export const InitialSessionHintContext = createContext(false);

export type SessionState =
  | { status: 'loading'; user: undefined }
  | { status: 'guest'; user: undefined }
  | { status: 'user'; user: User };

/**
 * Who is using the site. A guest costs no request at all: the hint cookie says there is no login.
 * 'loading' only happens for someone who probably is logged in, while we ask the backend who they are.
 */
export function useSession(): SessionState {
  const initialHint = useContext(InitialSessionHintContext);
  const hint = useSyncExternalStore(subscribeSessionHint, hasSessionHint, () => initialHint);

  const me = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    enabled: hint,
    retry: false,
    staleTime: 60_000,
  });

  if (!hint) return { status: 'guest', user: undefined };
  if (me.data) return { status: 'user', user: me.data };
  if (me.isError) return { status: 'guest', user: undefined };
  return { status: 'loading', user: undefined };
}
