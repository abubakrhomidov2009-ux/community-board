import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';

/** Pages a guest can open (About). */
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
