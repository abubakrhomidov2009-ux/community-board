import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { AdminPostDetail } from '@/features/admin/components/AdminDetails';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <AdminPostDetail id={id} />;
}
