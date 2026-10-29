'use client';

import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { setSessionExpiredHandler } from '@/lib/api/axios';
import { safeNextPath } from '@/lib/safe-path';
import { clearSessionHint } from '@/lib/session-hint';
import type { AuthMode } from './AuthSlip';

// The modal (forms, validation, sheet) is only downloaded when someone needs it, so the first page loads fast.
// It is also fetched quietly when the browser is idle (see below), so opening it still feels instant.
const loadAuthModal = () => import('./AuthModal').then((module) => module.AuthModal);
const AuthModal = dynamic(loadAuthModal, { ssr: false });

interface AuthContextValue {
  /** Opens the Log in / Create account modal. `next` is the page to open after login. */
  openAuth: (mode?: AuthMode, next?: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

// Pages a guest may open (the proxy uses the same list).
const PUBLIC_PATHS = ['/', '/about'];

/**
 * Owns the auth modal. It opens from a button, from the address (?login=1&next=...) and when a login can
 * no longer be renewed. After login it closes and goes to `next`, or to Home.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter(); // adds the language to the path
  const nextRouter = useNextRouter(); // takes the full path
  const pathname = usePathname();

  const [state, setState] = useState<{ open: boolean; mode: AuthMode; next: string | null }>({
    open: false,
    mode: 'login',
    next: null,
  });

  // Mount the modal the first time it is wanted; after that it stays mounted so it can animate out.
  const [wanted, setWanted] = useState(false);

  const openAuth = useCallback((mode: AuthMode = 'login', next: string | null = null) => {
    setWanted(true);
    setState({ open: true, mode, next });
  }, []);

  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 2000));
    idle(() => void loadAuthModal());
  }, []);

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
    // If the modal was opened by the address, take ?login=1&next=... out of it.
    if (window.location.search.includes('login=1')) router.replace(pathname);
  }, [pathname, router]);

  const onSuccess = useCallback(() => {
    const target = safeNextPath(state.next, '');
    setState((current) => ({ ...current, open: false }));
    if (target) nextRouter.push(target);
    else router.push('/posts');
  }, [nextRouter, router, state.next]);

  // The login ran out and could not be renewed: forget it and ask for a new login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSessionHint();
      queryClient.clear();
      if (PUBLIC_PATHS.includes(pathname)) {
        openAuth('login');
      } else {
        const here = `${window.location.pathname}${window.location.search}`;
        router.replace(`/?login=1&next=${encodeURIComponent(here)}`);
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [openAuth, pathname, queryClient, router]);

  const value = useMemo(() => ({ openAuth }), [openAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <OpenFromUrl openAuth={openAuth} />
      </Suspense>
      {wanted && (
        <AuthModal
          open={state.open}
          mode={state.mode}
          onModeChange={(mode) => setState((current) => ({ ...current, mode }))}
          onOpenChange={(open) => (open ? undefined : close())}
          onSuccess={onSuccess}
        />
      )}
    </AuthContext.Provider>
  );
}

/** Opens the modal when the address says ?login=1 (a guest followed a link to a members-only page). */
function OpenFromUrl({ openAuth }: { openAuth: AuthContextValue['openAuth'] }) {
  const params = useSearchParams();
  const wantsLogin = params.get('login') === '1';
  const next = params.get('next');
  useEffect(() => {
    if (wantsLogin) openAuth('login', next);
  }, [wantsLogin, next, openAuth]);
  return null;
}
