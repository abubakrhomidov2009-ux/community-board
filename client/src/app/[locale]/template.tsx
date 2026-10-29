import type { ReactNode } from 'react';

// Page change: the new page fades in and moves up 8px (200 ms). Plain CSS, so it also plays on the first
// load and is switched off for people who asked their device for less motion.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
      {children}
    </div>
  );
}
