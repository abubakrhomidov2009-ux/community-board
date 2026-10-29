import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { AboutPage } from '@/components/about/AboutPage';

// /[locale]: the front door is the About page.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <AboutPage />;
}
