'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

const OPTIONS = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

const noop = () => () => {};

/** Light / Dark / System. Saved on the device by next-themes. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser: show a placeholder until then (no mismatch, no flash).
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  if (!mounted) return <Skeleton className={cn('h-11 w-[258px] rounded-full', className)} />;

  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className={cn('inline-flex rounded-full bg-soft p-1', className)}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = (theme ?? 'system') === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors duration-150',
              active
                ? 'bg-paper text-ink shadow-[0_0_0_1px_var(--border)]'
                : 'text-body hover:text-ink',
            )}
          >
            <Icon size={15} strokeWidth={2} aria-hidden="true" />
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
