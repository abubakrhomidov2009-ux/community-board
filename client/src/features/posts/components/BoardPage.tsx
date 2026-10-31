'use client';

import { SearchX, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { SlipSkeleton } from '@/components/shared/PostSlip';
import { StateSlip } from '@/components/shared/StateSlip';
import { pillClass } from '@/components/shared/pill-button';
import { toApiError } from '@/lib/api/errors';
import { DISTRICTS } from '../api';
import { usePostCounts, usePostsInfinite } from '../queries';
import { useBoardFilters } from '../useBoardFilters';
import { CategoryTabs } from './CategoryTabs';
import { Chip } from './Chip';
import { FilterSheet } from './FilterSheet';
import { PriceFilter } from './PriceFilter';
import { SearchBox } from './SearchBox';
import { SlipGrid } from './SlipGrid';
import { SortSelect } from './SortSelect';

/** The Home page: search, category tabs, filters, sort and the slips. Design: Main (laptop), HomeMobile (phone). */
export function BoardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { filters, update, clear } = useBoardFilters();
  const posts = usePostsInfinite(filters);
  const counts = usePostCounts(filters);

  const errorCode = posts.isError ? toApiError(posts.error).errorCode : '';
  const errorText = t.has(`errors.${errorCode}` as never)
    ? t(`errors.${errorCode}` as never)
    : t('errors.UNKNOWN');

  const items = useMemo(() => posts.data?.pages.flatMap((page) => page.items) ?? [], [posts.data]);
  const total = posts.data?.pages[0]?.total ?? 0;

  // Long date on a laptop (Friday, October 30), short on a phone (Fri, Oct 30).
  const dateIn = (style: 'long' | 'short') =>
    new Intl.DateTimeFormat(locale, {
      weekday: style,
      day: 'numeric',
      month: style,
      timeZone: 'Asia/Dushanbe',
    }).format(new Date());

  const hasFilters = Boolean(
    filters.q ||
    filters.category ||
    filters.district ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined,
  );

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-36 pt-1 md:gap-7 md:px-6 md:pb-16 md:pt-9"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-5">
        <div className="flex items-end justify-between gap-3 md:flex-col md:items-start md:justify-end md:gap-1.5">
          <h1 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-1px] md:order-2 md:text-[46px] md:tracking-[-1.5px]">
            {t('board.title')}
          </h1>
          <p
            suppressHydrationWarning
            className="m-0 whitespace-nowrap text-[13px] font-semibold capitalize text-body-2 md:order-1 md:text-sm"
          >
            <span className="md:hidden">{t('board.dateShort', { date: dateIn('short') })}</span>
            <span className="hidden md:inline">
              {t('board.dateLine', { date: dateIn('long') })}
            </span>
          </p>
        </div>
        <div className="md:min-w-[260px] md:flex-[0_1_460px]">
          <SearchBox current={filters.q ?? ''} onSearch={(q) => update({ q })} />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:gap-0">
        <CategoryTabs
          value={filters.category}
          counts={counts.data}
          onChange={(category) => update({ category })}
        />

        {/* Phone: filters button and sort */}
        <div className="flex gap-2 md:hidden">
          <FilterSheet filters={filters} total={undefined} onApply={update} />
          <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} />
        </div>

        {/* Laptop: where, sort, price */}
        <div className="hidden flex-wrap items-center gap-2.5 rounded-[0_18px_18px_18px] border border-border bg-paper px-5 py-[18px] md:flex">
          <span className="mr-1 text-[13px] font-bold uppercase tracking-[0.6px] text-body-2">
            {t('board.where')}
          </span>
          {DISTRICTS.map((district) => (
            <Chip
              key={district}
              pressed={filters.district === district}
              onClick={() =>
                update({ district: filters.district === district ? undefined : district })
              }
            >
              {t(`district.${district}`)}
            </Chip>
          ))}
          <span className="flex-1" />
          <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} />
          <PriceFilter
            value={{ minPrice: filters.minPrice, maxPrice: filters.maxPrice }}
            onApply={(range) => update(range)}
          />
        </div>
      </div>

      {posts.isPending && <GridSkeleton />}

      {posts.isError && (
        <StateSlip
          icon={<TriangleAlert size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('board.errorTitle')}
          text={errorText}
          action={
            <button
              type="button"
              className={pillClass('ink', 'md')}
              onClick={() => posts.refetch()}
            >
              {t('common.retry')}
            </button>
          }
        />
      )}

      {posts.isSuccess && items.length === 0 && (
        <StateSlip
          icon={<SearchX size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('board.emptyTitle')}
          text={t('board.emptyText')}
          action={
            hasFilters ? (
              <button type="button" className={pillClass('outline', 'md')} onClick={clear}>
                {t('board.clear')}
              </button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <>
          <SlipGrid
            posts={items}
            className={
              'grid grid-cols-1 gap-x-7 gap-y-10 pt-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ' +
              (posts.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity')
            }
          />

          <div className="flex flex-col items-center gap-2.5">
            {posts.hasNextPage && (
              <button
                type="button"
                disabled={posts.isFetchingNextPage}
                onClick={() => posts.fetchNextPage()}
                className={pillClass('outline', 'lg', 'h-[52px] text-[15px]')}
              >
                {posts.isFetchingNextPage ? t('board.loadingMore') : t('board.showMore')}
              </button>
            )}
            <span className="text-[13px] text-body-2">
              {t('board.showing', { shown: items.length, total })}
            </span>
          </div>
        </>
      )}
    </main>
  );
}

function GridSkeleton() {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid grid-cols-1 gap-x-7 gap-y-10 pt-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <span className="sr-only">{t('loading')}</span>
      {Array.from({ length: 8 }, (_, i) => (
        <SlipSkeleton key={i} photo={i % 2 === 0} />
      ))}
    </div>
  );
}
