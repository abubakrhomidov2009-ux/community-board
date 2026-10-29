import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BoardSkeleton } from '@/components/shared/BoardSkeleton';
import { RequireSession } from '@/features/auth/components/RequireSession';

/** Pages that need a login. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <RequireSession fallback={<BoardSkeleton />}>{children}</RequireSession>
    </>
  );
}
