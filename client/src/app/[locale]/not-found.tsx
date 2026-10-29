import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { NotFoundActions } from '@/components/shared/NotFoundActions';

/** The 404 page: a slip that is "not on the board". Shown for unknown addresses and for posts or users that do not exist. */
export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="flex min-h-[70dvh] items-center justify-center px-5 py-12 md:px-6 md:py-16"
      >
        <article className="relative w-full max-w-[500px] rotate-[1.2deg] rounded-[8px_8px_24px_24px] border border-border bg-paper">
          <span
            aria-hidden="true"
            className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full border-4"
          />
          <div className="h-2 rounded-[7px_7px_0_0] bg-ink" />
          <div className="relative flex flex-col gap-3 p-[36px_32px_28px]">
            <span className="absolute right-6 top-[22px] -rotate-[10deg] rounded-lg border-[3px] border-stamp-scam px-3 py-1 font-display text-sm font-bold tracking-[1px] text-stamp-scam">
              {t('stamp')}
            </span>
            <h1 className="m-0 max-w-[340px] font-display text-[32px] font-bold leading-[1.1] tracking-[-1px]">
              {t('title')}
            </h1>
            <p className="m-0 text-base leading-[1.6] text-body">{t('text')}</p>
          </div>
          <NotFoundActions />
        </article>
      </main>
    </>
  );
}
