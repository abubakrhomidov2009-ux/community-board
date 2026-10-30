'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CATEGORIES, type Category, type PostCounts } from '../api';
import { KIND_OF } from '../format';

const DOT = { lost: 'bg-lost', tutor: 'bg-tutor', rent: 'bg-rent', other: 'bg-other' } as const;

/**
 * Category choice. On a laptop: folder tabs that sit on top of the filter panel.
 * On a phone: round chips you scroll sideways.
 */
export function CategoryTabs({
  value,
  counts,
  onChange,
}: {
  value: Category | undefined;
  counts: PostCounts | undefined;
  onChange: (category: Category | undefined) => void;
}) {
  const t = useTranslations();
  const items: { key: Category | undefined; label: string; count?: number }[] = [
    { key: undefined, label: t('board.all'), count: counts?.ALL },
    ...CATEGORIES.map((category) => ({
      key: category,
      label: t(`category.${category}`),
      count: counts?.[category],
    })),
  ];

  return (
    <>
      {/* Phone: chips */}
      <div
        role="tablist"
        aria-label={t('board.categoryLabel')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none]"
      >
        {items.map(({ key, label, count }) => {
          const active = key === value;
          return (
            <button
              key={key ?? 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm transition-colors duration-150',
                active
                  ? 'border-ink bg-ink font-bold text-on-ink'
                  : 'border-line bg-paper font-semibold text-ink',
              )}
            >
              {key && <span className={cn('size-2 rounded-full', DOT[KIND_OF[key]])} />}
              {label}
              {count !== undefined && <span className={active ? '' : 'text-body-2'}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Laptop: folder tabs */}
      <div
        role="tablist"
        aria-label={t('board.categoryLabel')}
        className="hidden flex-wrap items-end gap-1.5 pl-1 md:flex"
      >
        {items.map(({ key, label, count }) => {
          const active = key === value;
          return (
            <button
              key={key ?? 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={cn(
                'flex items-center gap-2 rounded-t-[14px] border border-b-0 border-border px-[18px] text-[15px] transition-colors duration-150',
                active
                  ? 'h-[52px] bg-paper font-bold text-ink'
                  : 'h-11 bg-soft font-semibold text-body hover:text-ink',
              )}
            >
              {key && <span className={cn('size-[9px] rounded-full', DOT[KIND_OF[key]])} />}
              {label}
              {count !== undefined &&
                (active ? (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-on-ink">
                    {count}
                  </span>
                ) : (
                  <span className="text-body-2">{count}</span>
                ))}
            </button>
          );
        })}
      </div>
    </>
  );
}
