'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { isSigningOut } from '@/lib/session-hint';
import { useSession } from '../queries';

/**
 * Wraps the pages that need a login. While the backend says who the user is, it shows the page's own
 * skeleton. A guest is sent to About with the Log in modal open and comes back here after logging in.
 */
export function RequireSession({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'guest' && !isSigningOut()) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/?login=1&next=${encodeURIComponent(here)}`);
    }
  }, [router, session.status]);

  return session.status === 'user' ? children : fallback;
}
