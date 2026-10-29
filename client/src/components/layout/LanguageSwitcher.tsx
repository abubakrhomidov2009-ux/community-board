'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

// Shown as "Тҷ · Ру · En" like the design.
const ORDER: Locale[] = ['tg', 'ru', 'en'];

/** The current language is green. Keeps the page and the query (for example ?login=1). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  function switchTo(locale: Locale) {
    if (locale === current) return;
    router.replace(search ? `${pathname}?${search}` : pathname, { locale });
  }

  return (
    <div role="group" aria-label={t('language')} className={cn('flex items-center', className)}>
      {ORDER.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="text-body-2">
              ·
            </span>
          )}
          <button
            type="button"
            lang={locale}
            aria-label={t(`languageName.${locale}`)}
            aria-current={locale === current ? 'true' : undefined}
            onClick={() => switchTo(locale)}
            className={cn(
              'h-11 min-w-9 rounded-full px-1.5 text-[13px] font-bold transition-colors duration-150',
              locale === current ? 'text-primary' : 'text-body hover:text-ink',
            )}
          >
            {t(`languageShort.${locale}`)}
          </button>
        </span>
      ))}
    </div>
  );
}
