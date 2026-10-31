import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { UserPage } from '@/features/users/components/UserPage';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale as Locale);
  return <UserPage username={decodeURIComponent(username)} />;
}
