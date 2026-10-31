'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StateSlip } from '@/components/shared/StateSlip';
import { SlipSkeleton } from '@/components/shared/PostSlip';
import { pillClass } from '@/components/shared/pill-button';
import { SlipGrid } from '@/features/posts/components/SlipGrid';
import { Link } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { useFavorites } from '../queries';

/** "Saved slips": only the person who saved them sees this list. Design: SavedDesktop, SavedMobile. */
export function SavedPage() {
  const t = useTranslations();
  const saved = useFavorites();
  const items = saved.data?.pages.flatMap((page) => page.items) ?? [];
  const total = saved.data?.pages[0]?.total ?? 0;

  const code = saved.isError ? toApiError(saved.error).errorCode : '';
  const errorText = t.has(`errors.${code}` as never)
    ? t(`errors.${code}` as never)
    : t('errors.UNKNOWN');

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-36 pt-2 md:gap-7 md:px-6 md:pb-16 md:pt-9"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold text-body-2">{t('saved.only')}</p>
          <h1 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-1px] md:text-[46px] md:tracking-[-1.5px]">
            {t('saved.title')}
          </h1>
        </div>
        {saved.isSuccess && total > 0 && (
          <span className="flex h-11 items-center gap-2 rounded-full border border-border bg-paper px-[18px] text-sm font-bold">
            <Heart
              size={16}
              strokeWidth={2}
              fill="currentColor"
              className="text-danger"
              aria-hidden="true"
            />
            {t('saved.count', { count: total })}
          </span>
        )}
      </div>

      {saved.isPending && (
        <div
          role="status"
          aria-busy="true"
          className="grid grid-cols-1 gap-x-7 gap-y-10 pt-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <span className="sr-only">{t('common.loading')}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <SlipSkeleton key={i} photo={i % 2 === 0} />
          ))}
        </div>
      )}

      {saved.isError && (
        <StateSlip
          icon={<Heart size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('board.errorTitle')}
          text={errorText}
          action={
            <button
              type="button"
              className={pillClass('ink', 'md')}
              onClick={() => saved.refetch()}
            >
              {t('common.retry')}
            </button>
          }
        />
      )}

      {saved.isSuccess && items.length === 0 && (
        <StateSlip
          icon={<Heart size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('saved.emptyTitle')}
          text={t('saved.emptyText')}
          action={
            <Link href="/posts" className={pillClass('ink', 'md')}>
              {t('saved.emptyAction')}
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <>
          <SlipGrid posts={items} />
          {saved.hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={saved.isFetchingNextPage}
                onClick={() => saved.fetchNextPage()}
                className={pillClass('outline', 'lg', 'h-[52px] text-[15px]')}
              >
                {saved.isFetchingNextPage ? t('board.loadingMore') : t('board.showMore')}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
