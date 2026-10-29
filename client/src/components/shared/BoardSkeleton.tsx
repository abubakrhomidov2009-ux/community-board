import { useTranslations } from 'next-intl';
import { Skeleton } from './Skeleton';
import { SlipSkeleton } from './PostSlip';

/** The placeholder for any page that shows the board: a title line and a grid of slips. */
export function BoardSkeleton({ count = 6 }: { count?: number }) {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto max-w-[1280px] px-5 pb-16 pt-6 md:px-8 md:pt-10"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="mb-6 h-9 w-48 rounded-full md:mb-8 md:h-11 md:w-64" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <SlipSkeleton key={i} photo={i % 2 === 0} />
        ))}
      </div>
    </div>
  );
}
