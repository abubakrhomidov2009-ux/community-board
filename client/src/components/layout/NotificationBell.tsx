'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUnreadCount } from '@/features/notifications/queries';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** The bell with the number of unread notifications. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const { data: count = 0 } = useUnreadCount(true);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? t('notificationsUnread', { count }) : t('notifications')}
      className={cn(
        'relative flex size-11 items-center justify-center rounded-full border border-border bg-paper text-ink no-underline lg:border-0 lg:bg-soft',
        className,
      )}
    >
      <Bell size={19} strokeWidth={2} aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-[5px] top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-pin px-1 text-[9px] font-bold text-[#3b2203]"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
