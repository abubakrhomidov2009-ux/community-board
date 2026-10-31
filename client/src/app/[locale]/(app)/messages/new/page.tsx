import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { MessagesShell } from '@/features/messages/components/MessagesShell';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { locale } = await params;
  const { to } = await searchParams;
  setRequestLocale(locale as Locale);
  return <MessagesShell active={to ? 'new' : undefined} to={to} />;
}
