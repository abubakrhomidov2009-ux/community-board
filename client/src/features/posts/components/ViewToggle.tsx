'use client';

import { List, Map as MapIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type BoardView = 'list' | 'map';

/** List | Map switch for the board. */
export function ViewToggle({
  value,
  onChange,
}: {
  value: BoardView;
  onChange: (view: BoardView) => void;
}) {
  const t = useTranslations('map');
  const options = [
    { value: 'list', label: t('list'), icon: List },
    { value: 'map', label: t('map'), icon: MapIcon },
  ] as const;
  return (
    <div
      role="group"
      aria-label={t('viewLabel')}
      className="inline-flex rounded-full border-[1.5px] border-line bg-paper p-0.5"
    >
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-150',
            value === v ? 'bg-ink font-bold text-on-ink' : 'font-semibold text-body',
          )}
        >
          <Icon size={15} strokeWidth={2} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
