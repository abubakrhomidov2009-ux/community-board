import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { SavedPage } from '@/features/favorites/components/SavedPage';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <SavedPage />;
}
