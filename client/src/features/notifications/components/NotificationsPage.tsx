'use client';

import { Bell, Clock, MessageCircle, Send, ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ComponentType } from 'react';
import { StateSlip } from '@/components/shared/StateSlip';
import { Skeleton } from '@/components/shared/Skeleton';
import { pillClass } from '@/components/shared/pill-button';
import { timeAgo } from '@/features/posts/format';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { Notification } from '../api';
import { useMarkAllRead, useMarkRead, useNotifications } from '../queries';

const STYLE: Record<
  Notification['type'],
  { icon: ComponentType<{ size?: number; strokeWidth?: number }>; tone: string }
> = {
  NEW_COMMENT: {
    icon: MessageCircle,
    tone: 'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a] dark:text-[#bfdbfe]',
  },
  POST_EXPIRING: {
    icon: Clock,
    tone: 'bg-[#fef3c7] text-[#92400e] dark:bg-[#4a3a12] dark:text-[#fde68a]',
  },
  POST_REMOVED: {
    icon: ShieldAlert,
    tone: 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#4c1d1d] dark:text-[#fecaca]',
  },
  NEW_MESSAGE: { icon: Send, tone: 'bg-primary-soft text-primary-soft-ink' },
};

/** Where a notification leads: the post, the chat, or nowhere (a removed slip has no page). */
function target(n: Notification): string | null {
  if (n.type === 'NEW_MESSAGE' && n.conversationId) return `/messages/${n.conversationId}`;
  if (n.type === 'POST_REMOVED') return null;
  if (n.postId) return `/posts/${n.postId}`;
  return null;
}

/** The list of notifications. Design: NotificationsDesktop, NotificationsMobile. */
export function NotificationsPage() {
  const t = useTranslations('notifications');
  const tc = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  // "Today" is decided once when the page opens.
  const [startOfToday] = useState(() => new Date().setHours(0, 0, 0, 0));

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const unread = items.filter((n) => !n.readAt).length;
  const today = items.filter((n) => new Date(n.createdAt).getTime() >= startOfToday);
  const earlier = items.filter((n) => new Date(n.createdAt).getTime() < startOfToday);

  function open(n: Notification) {
    if (!n.readAt) markRead.mutate(n.id);
    const to = target(n);
    if (to) router.push(to);
  }

  function row(n: Notification) {
    const { icon: Icon, tone } = STYLE[n.type];
    const isUnread = !n.readAt;
    return (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => open(n)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-4 rounded-[20px] border bg-paper p-[16px_20px] text-left text-ink',
            isUnread ? 'border-2 border-ink' : 'border-border',
          )}
        >
          <span
            className={cn(
              'flex size-[46px] shrink-0 items-center justify-center rounded-full',
              tone,
            )}
          >
            <Icon size={20} strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span
              className={cn(
                'text-[15px] leading-normal',
                isUnread ? 'font-semibold' : 'font-normal',
              )}
            >
              {t(n.type, { actor: n.actorUsername ?? t('someone') })}
            </span>
            <span className="text-[13px] text-muted">{timeAgo(n.createdAt, locale)}</span>
          </span>
          {isUnread && (
            <span
              role="img"
              aria-label={t('unread')}
              className="size-3 shrink-0 rounded-full bg-primary"
            />
          )}
        </button>
      </li>
    );
  }

  const heading = 'm-0 mt-2 font-display text-xs font-bold tracking-[1px] text-body-2 uppercase';

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[820px] flex-col gap-5 px-4 pb-36 pt-2 md:px-6 md:pb-16 md:pt-9"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold text-body-2">
            {unread > 0 ? t('newCount', { count: unread }) : t('allRead')}
          </p>
          <h1 className="m-0 font-display text-[30px] font-bold tracking-[-1px] md:text-[40px] md:tracking-[-1.2px]">
            {t('title')}
          </h1>
        </div>
        {unread > 0 && (
          <button
            type="button"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
            className={pillClass('outline', 'md', 'text-sm')}
          >
            {t('markAll')}
          </button>
        )}
      </div>

      {list.isPending && (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">{tc('common.loading')}</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[78px] rounded-[20px]" />
          ))}
        </div>
      )}

      {list.isError && (
        <StateSlip
          icon={<Bell size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={tc('board.errorTitle')}
          text={tc('errors.UNKNOWN')}
          action={
            <button type="button" className={pillClass('ink', 'md')} onClick={() => list.refetch()}>
              {tc('common.retry')}
            </button>
          }
        />
      )}

      {list.isSuccess && items.length === 0 && (
        <StateSlip
          icon={<Bell size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('emptyTitle')}
          text={t('emptyText')}
        />
      )}

      {today.length > 0 && (
        <>
          <h2 className={heading}>{t('today')}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">{today.map(row)}</ul>
        </>
      )}
      {earlier.length > 0 && (
        <>
          <h2 className={heading}>{t('earlier')}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">{earlier.map(row)}</ul>
        </>
      )}

      {list.hasNextPage && (
        <button
          type="button"
          disabled={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
          className={pillClass('outline', 'md', 'self-center')}
        >
          {t('showMore')}
        </button>
      )}
    </main>
  );
}
