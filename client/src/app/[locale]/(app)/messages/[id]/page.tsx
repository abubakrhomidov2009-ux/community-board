import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { MessagesShell } from '@/features/messages/components/MessagesShell';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <MessagesShell active={id} />;
}
