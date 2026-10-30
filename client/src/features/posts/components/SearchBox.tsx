'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/**
 * The search field. Waits a moment after typing, then tells the board.
 * `current` is the search in the page address: when it changes from outside (Clear filters, the Back button)
 * the box follows it.
 */
export function SearchBox({
  current,
  onSearch,
}: {
  current: string;
  onSearch: (q: string | undefined) => void;
}) {
  const t = useTranslations('board');
  const [value, setValue] = useState(current);
  const [seen, setSeen] = useState(current);
  const sent = useRef(current);
  if (current !== seen) {
    // Adjusting state while rendering is the React way to follow a changed prop (no extra effect).
    setSeen(current);
    if (current !== value.trim()) setValue(current);
  }
  const callback = useRef(onSearch);
  useEffect(() => {
    callback.current = onSearch;
  });

  useEffect(() => {
    const next = value.trim();
    if (next === sent.current || next === current) {
      sent.current = next;
      return;
    }
    const timer = setTimeout(() => {
      sent.current = next;
      callback.current(next || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, current]);

  return (
    <div className="relative">
      <label htmlFor="board-search" className="sr-only">
        {t('searchLabel')}
      </label>
      <Search
        size={20}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-body-2 md:left-5"
      />
      <input
        id="board-search"
        type="search"
        value={value}
        maxLength={100}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('searchPlaceholder')}
        className="h-[50px] w-full rounded-full border-[1.5px] border-ink bg-paper pl-[46px] pr-4 text-base text-ink placeholder:text-muted md:h-14 md:pl-[52px] md:pr-5"
      />
    </div>
  );
}
