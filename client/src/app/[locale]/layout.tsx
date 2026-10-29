import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { preload } from 'react-dom';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { SESSION_HINT_COOKIE } from '@/lib/session-hint';
import { Providers } from '@/providers/Providers';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : 'en',
    namespace: 'meta',
  });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Load the main text and heading fonts early (the other scripts load only when a page needs them).
  for (const file of ['onest-latin', 'unbounded-latin', 'onest-cyrillic', 'onest-cyrillic-ext']) {
    preload(`/fonts/${file}.woff2`, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }

  // The "has a login" hint cookie, so the very first paint already shows the right header.
  const initialSessionHint = (await cookies()).has(SESSION_HINT_COOKIE);

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers initialSessionHint={initialSessionHint}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
