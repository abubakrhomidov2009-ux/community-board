import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A round choice button (a district, a category in the phone filter sheet). */
export function Chip({
  pressed,
  onClick,
  tone = 'ink',
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  tone?: 'ink' | 'green';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'h-10 rounded-full border-[1.5px] px-3.5 text-sm transition-colors duration-150',
        pressed
          ? tone === 'ink'
            ? 'border-ink bg-ink font-bold text-on-ink'
            : 'border-primary bg-primary-soft font-bold text-primary-soft-ink'
          : 'border-line bg-paper font-semibold text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}
