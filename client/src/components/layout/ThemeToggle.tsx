'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { useTheme, type Theme } from '@/providers/theme';

const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

const noop = () => () => {};

/** One small button in the nav bar: tap to go Light → Dark → System. */
export function ThemeToggle() {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const shown: Theme = mounted ? theme : 'system';
  const Icon = ICONS[shown];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[shown])}
      aria-label={`${t('label')}: ${t(shown)}`}
      title={`${t('label')}: ${t(shown)}`}
      className="flex size-11 items-center justify-center rounded-full text-body transition-colors duration-150 hover:bg-soft hover:text-ink"
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
