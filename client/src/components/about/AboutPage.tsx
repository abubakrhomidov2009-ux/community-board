import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import type { SlipData } from '@/components/shared/PostSlip';
import { Reveal } from '@/components/shared/Reveal';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { CtaButton, HeroActions } from './AboutActions';
import { PinnedSlip } from './PinnedSlip';

const DOTS =
  'bg-hero-board bg-[radial-gradient(rgba(255,255,255,0.16)_1.2px,transparent_1.5px)] bg-[length:20px_20px] max-md:bg-[length:18px_18px]';

/**
 * The About page: the front door of the site, and the only page a guest can open.
 * Sections: hero with example slips, the four categories, how it works, safety, house rules, call to action.
 */
export function AboutPage() {
  const t = useTranslations('about');
  const tc = useTranslations('category');
  const tb = useTranslations('common');

  const lost: SlipData = {
    kind: 'lost',
    categoryLabel: tc('LOST_FOUND'),
    time: t('examples.lost.time'),
    title: t('examples.lost.title'),
    price: t('examples.lost.price'),
    district: t('examples.lost.district'),
    tilt: -5,
  };
  const rent: SlipData = {
    kind: 'rent',
    categoryLabel: tc('RENTALS'),
    time: t('examples.rent.time'),
    title: t('examples.rent.title'),
    price: t('examples.rent.price'),
    district: t('examples.rent.district'),
    photo: true,
    tilt: 4,
  };
  const tutor: SlipData = {
    kind: 'tutor',
    categoryLabel: tc('TUTORING'),
    time: t('examples.tutor.time'),
    title: t('examples.tutor.title'),
    price: t('examples.tutor.price'),
    district: t('examples.tutor.district'),
    tilt: -2,
    status: 'resolved',
  };

  const steps = [
    { n: '01', title: t('how.step1Title'), text: t('how.step1Text') },
    { n: '02', title: t('how.step2Title'), text: t('how.step2Text') },
    { n: '03', title: t('how.step3Title'), text: t('how.step3Text') },
  ];
  const rules = [
    t('rules.item1'),
    t('rules.item2'),
    t('rules.item3'),
    t('rules.item4'),
    t('rules.item5'),
    t('rules.item6'),
  ];

  return (
    <main id="main" className="overflow-x-clip text-ink">
      {/* Hero */}
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-12 gap-y-6 px-5 pb-7 pt-5 md:px-6 md:pb-16 md:pt-14">
        <Reveal className="flex flex-[1_1_480px] flex-col gap-4 md:gap-6">
          <span className="flex h-[30px] items-center gap-[7px] self-start rounded-full border-[1.5px] border-ink px-3 text-xs font-bold md:h-[34px] md:gap-2 md:px-3.5 md:text-[13px]">
            <span className="size-[7px] rounded-full bg-rent md:size-2" />
            {t('badge')}
          </span>
          <h1 className="m-0 font-display text-[36px] font-bold leading-[1.05] tracking-[-1.4px] md:text-[62px] md:leading-[1.02] md:tracking-[-2.4px]">
            {t('heroTitleStart')} <span className="text-primary">{t('heroTitleAccent')}</span>
          </h1>
          <p className="m-0 max-w-[540px] text-base leading-[1.6] text-body md:text-[19px]">
            {t('heroText')}
          </p>
          <HeroActions />
          <p className="m-0 hidden text-sm text-body-2 md:block">{t('heroNote')}</p>
        </Reveal>

        {/* Example slips on a dark dotted board (decorative: not read out, not focusable) */}
        <div
          aria-hidden="true"
          inert
          className={cn(
            'relative hidden h-[520px] max-w-[560px] flex-[1_1_460px] rounded-[32px] md:block',
            DOTS,
          )}
        >
          <PinnedSlip item={lost} index={0} className="left-[30px] top-[50px] w-[250px]" />
          <PinnedSlip item={rent} index={1} className="right-7 top-7 w-[240px]" />
          <PinnedSlip item={tutor} index={2} className="bottom-[26px] left-[110px] w-[250px]" />
        </div>
      </section>

      <div
        aria-hidden="true"
        inert
        className={cn('relative mx-4 h-[400px] rounded-[28px] md:hidden', DOTS)}
      >
        <PinnedSlip
          item={{ ...lost, district: t('examples.lost.district') }}
          index={0}
          className="left-[18px] top-[30px] w-[210px]"
        />
        <PinnedSlip
          item={{ ...tutor, tilt: 4 }}
          index={1}
          className="bottom-[26px] right-3.5 w-[210px]"
        />
      </div>

      {/* The four categories */}
      <section
        id="kinds"
        className="mt-6 bg-ink px-5 py-[18px] text-on-ink md:mt-0 md:px-6 md:py-[26px]"
      >
        <p className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3.5 gap-y-2 font-display text-[19px] font-bold md:gap-x-7 md:gap-y-3.5 md:text-[30px] md:tracking-[-0.8px]">
          <span>{tc('LOST_FOUND')}</span>
          <Dot className="bg-lost" />
          <span>{tc('TUTORING')}</span>
          <Dot className="bg-tutor" />
          <span>{tc('RENTALS')}</span>
          <Dot className="bg-rent" />
          <span>{tc('OTHER')}</span>
        </p>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 pb-2 pt-7 md:gap-8 md:px-6 md:pb-10 md:pt-[72px]"
      >
        <Reveal>
          <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.6px] md:text-4xl md:tracking-[-1px]">
            {t('how.title')}
          </h2>
        </Reveal>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:gap-5">
          {steps.map((step, i) => (
            <li key={step.n}>
              <Reveal
                index={i}
                className="flex h-full items-center gap-3.5 rounded-[20px] border border-border bg-paper p-4 md:flex-col md:items-start md:gap-2.5 md:rounded-3xl md:p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-[32px] font-bold leading-none text-paper [-webkit-text-stroke:1.2px_var(--ink)] md:text-[56px] md:[-webkit-text-stroke:1.5px_var(--ink)]"
                >
                  {step.n}
                </span>
                <div className="flex flex-col gap-1 md:gap-2.5">
                  <h3 className="m-0 text-base font-bold md:text-xl">{step.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-body">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Safe and fair + house rules */}
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-6 px-5 pb-10 pt-8 md:px-6 md:pb-[72px] md:pt-10">
        <Reveal className="flex flex-[1_1_420px] flex-col gap-[18px] rounded-3xl border border-border bg-paper p-6 md:p-8">
          <h2 className="m-0 font-display text-[22px] font-bold tracking-[-0.6px] md:text-[26px]">
            {t('safe.title')}
          </h2>
          <SafeRow
            stamp={t('safe.checkedStamp')}
            text={t('safe.checkedText')}
            tone="border-stamp-resolved text-stamp-resolved"
            tilt="-rotate-6"
          />
          <SafeRow
            stamp={t('safe.studentStamp')}
            text={t('safe.studentText')}
            tone="border-stamp-student text-stamp-student"
            tilt="rotate-[4deg]"
          />
          <SafeRow
            stamp={t('safe.daysStamp')}
            text={t('safe.daysText')}
            tone="border-stamp-expired text-stamp-expired"
            tilt="-rotate-3"
          />
        </Reveal>

        <Reveal className="relative flex-[1_1_420px] rounded-[8px_8px_24px_24px] border border-note-border bg-note p-[30px_22px_22px] md:p-[36px_32px_32px]">
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 -ml-2.5 size-5 rounded-full border-4 border-paper bg-note-pin shadow-[0_0_0_1px_var(--note-border)]"
          />
          <div id="rules">
            <h2 className="m-0 mb-3.5 font-display text-xl font-bold tracking-[-0.6px] md:text-[26px]">
              {t('rules.title')}
            </h2>
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-[1.5] text-note-ink md:gap-[9px] md:pl-[22px] md:text-base">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-[1280px] px-5 pb-8 md:px-6 md:pb-14">
        <Reveal className="flex flex-col gap-4 rounded-[28px] bg-cta p-[28px_22px] text-on-cta md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:rounded-[32px] md:p-12">
          <h2 className="m-0 font-display text-[26px] font-bold leading-[1.12] tracking-[-0.8px] md:text-[40px] md:leading-[1.1] md:tracking-[-1.2px]">
            {t('cta.line1')}
            <br />
            {t('cta.line2')}
          </h2>
          <div className="max-md:[&>*]:w-full">
            <CtaButton />
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 pb-8 md:px-6">
        <p
          aria-hidden="true"
          className="m-0 overflow-hidden font-brand text-[44px] font-bold leading-[0.95] tracking-[-2px] text-ghost sm:whitespace-nowrap sm:text-[clamp(44px,8vw,112px)] sm:leading-[0.9] sm:tracking-[-5px]"
        >
          {tb('wordmarkStart')}
          <br className="sm:hidden" />
          {tb('wordmarkEnd')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-body-2">
          <span>{t('footer.madeIn')}</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/#how" className="hidden text-body-2 no-underline hover:text-ink md:inline">
              {t('how.title')}
            </Link>
            <Link
              href="/#rules"
              className="hidden text-body-2 no-underline hover:text-ink md:inline"
            >
              {t('rules.title')}
            </Link>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </footer>
    </main>
  );
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('size-2.5 rounded-full md:size-3.5', className)} />;
}

function SafeRow({
  stamp,
  text,
  tone,
  tilt,
}: {
  stamp: string;
  text: string;
  tone: string;
  tilt: string;
}) {
  return (
    <p className="m-0 flex items-start gap-3 text-base leading-[1.55]">
      <span
        className={cn(
          'shrink-0 rounded-md border-2 px-2 py-0.5 font-display text-[11px] font-bold uppercase',
          tilt,
          tone,
        )}
      >
        {stamp}
      </span>
      {text}
    </p>
  );
}
