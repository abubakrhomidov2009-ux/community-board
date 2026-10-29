'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { InitialSessionHintContext } from '@/features/auth/queries';
import { makeQueryClient } from '@/lib/query-client';

// Only in development, and only downloaded then.
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
  {
    ssr: false,
  },
);

/** Theme (Light / Dark / System), motion rules, server data (TanStack Query) and the auth modal. */
export function Providers({
  children,
  initialSessionHint,
}: {
  children: ReactNode;
  initialSessionHint: boolean;
}) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* People who asked their device for less motion get simple fades instead of sliding and scaling. */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <InitialSessionHintContext.Provider value={initialSessionHint}>
            <AuthProvider>{children}</AuthProvider>
          </InitialSessionHintContext.Provider>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
