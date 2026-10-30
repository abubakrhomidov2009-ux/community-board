'use client';

import { useTranslations } from 'next-intl';
import { SORTS, type PostSort } from '../api';

/** A real <select>: on a phone it opens the phone's own picker. */
export function SortSelect({
  value,
  onChange,
}: {
  value: PostSort;
  onChange: (sort: PostSort) => void;
}) {
  const t = useTranslations('board');
  return (
    <>
      <label htmlFor="board-sort" className="sr-only">
        {t('sort')}
      </label>
      <select
        id="board-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as PostSort)}
        className="h-10 rounded-full border-[1.5px] border-line bg-paper px-3 text-sm font-semibold text-ink"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`sortOptions.${sort}`)}
          </option>
        ))}
      </select>
    </>
  );
}
