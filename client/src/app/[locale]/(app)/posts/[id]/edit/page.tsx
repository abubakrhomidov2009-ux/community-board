import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { EditPost } from '@/features/posts/components/EditPost';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <EditPost id={id} />;
}
