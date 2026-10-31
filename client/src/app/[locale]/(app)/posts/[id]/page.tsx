import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { PostDetail } from '@/features/posts/components/PostDetail';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <PostDetail id={id} />;
}
