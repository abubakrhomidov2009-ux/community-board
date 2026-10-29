import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/shared/Skeleton';
import { SlipSkeleton } from '@/components/shared/PostSlip';

/** Shown while the About page loads: the same blocks in the same places (hero, board, band, three steps). */
export function AboutSkeleton() {
  const t = useTranslations('common');
  return (
    <div role="status" aria-busy="true" className="overflow-x-clip">
      <span className="sr-only">{t('loading')}</span>
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-12 gap-y-6 px-5 pb-7 pt-5 md:px-6 md:pb-16 md:pt-14">
        <div className="flex flex-[1_1_480px] flex-col gap-4 md:gap-6">
          <Skeleton className="h-[30px] w-52 rounded-full md:h-[34px]" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full rounded-full md:h-[62px]" />
            <Skeleton className="h-10 w-4/5 rounded-full md:h-[62px]" />
            <Skeleton className="h-10 w-3/5 rounded-full md:h-[62px]" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full max-w-[540px] rounded-full" />
            <Skeleton className="h-4 w-4/5 max-w-[430px] rounded-full" />
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Skeleton className="h-[54px] w-full rounded-full md:h-14 md:w-32" />
            <Skeleton className="h-[54px] w-full rounded-full md:h-14 md:w-44" />
          </div>
        </div>
        <div className="relative hidden h-[520px] max-w-[560px] flex-[1_1_460px] rounded-[32px] bg-hero-board md:block">
          <div className="absolute left-[30px] top-[50px] w-[250px]">
            <SlipSkeleton />
          </div>
          <div className="absolute right-7 top-7 w-[240px]">
            <SlipSkeleton photo />
          </div>
        </div>
      </section>
      <div className="mx-4 h-[400px] rounded-[28px] bg-hero-board md:hidden" aria-hidden="true" />
      <div className="mt-6 h-[62px] bg-ink md:mt-0 md:h-[97px]" aria-hidden="true" />
      <section className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 pt-7 md:gap-8 md:px-6 md:pt-[72px]">
        <Skeleton className="h-8 w-56 rounded-full" />
        <div className="grid gap-3 md:grid-cols-3 md:gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[20px] border border-border bg-paper p-4 md:rounded-3xl md:p-7"
            >
              <Skeleton className="mb-3 h-10 w-16 rounded-full md:h-14" />
              <Skeleton className="mb-2 h-5 w-32 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
