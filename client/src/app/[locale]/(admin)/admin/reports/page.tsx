import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { AdminReports } from '@/features/admin/components/AdminLists';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <AdminReports />;
}
