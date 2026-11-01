'use client';

import { LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { SlipSkeleton } from '@/components/shared/PostSlip';
import { StateSlip } from '@/components/shared/StateSlip';
import { pillClass } from '@/components/shared/pill-button';
import { useLogoutMutation } from '@/features/auth/mutations';
import { useSession } from '@/features/auth/queries';
import { SlipGrid } from '@/features/posts/components/SlipGrid';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useMyPosts } from '../queries';
import { EditProfileDialog } from './EditProfileDialog';
import { Layers } from 'lucide-react';

const STATUSES = ['ACTIVE', 'RESOLVED', 'EXPIRED', 'REMOVED'] as const;
type Status = (typeof STATUSES)[number];

/** My profile: the dark header, tabs for my slips by status, edit profile and Log out. Design: ProfileDesktop/Mobile. */
export function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const session = useSession();
  const logout = useLogoutMutation();
  const [tab, setTab] = useState<Status>('ACTIVE');
  const [editing, setEditing] = useState(false);
  // One query per tab: the numbers on the tabs are the totals the backend reports.
  const active = useMyPosts('ACTIVE');
  const resolved = useMyPosts('RESOLVED');
  const expired = useMyPosts('EXPIRED');
  const removed = useMyPosts('REMOVED');
  const queries = { ACTIVE: active, RESOLVED: resolved, EXPIRED: expired, REMOVED: removed };
  const totalOf = (status: Status) => queries[status].data?.pages[0]?.total ?? 0;

  const user = session.user;
  if (!user) return <ProfileSkeleton />;

  const current = queries[tab];
  const items = current.data?.pages.flatMap((page) => page.items) ?? [];
  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(user.createdAt),
  );

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-36 pt-2 md:gap-7 md:px-6 md:pb-16 md:pt-8"
    >
      <section className="flex flex-wrap items-center gap-5 rounded-[28px] bg-ink p-6 text-on-ink md:gap-6 md:p-[30px_32px]">
        <Avatar
          username={user.username}
          avatarUrl={user.avatarUrl}
          size={96}
          className="font-display"
        />
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-display text-[26px] font-bold tracking-[-0.8px] [overflow-wrap:anywhere] md:text-[32px]">
              {user.username}
            </h1>
            {user.isStudentVerified && (
              <span className="-rotate-[4deg] rounded-md border-2 border-[#5eead4] px-2 py-0.5 font-display text-[11px] font-bold uppercase text-[#5eead4]">
                {t('post.student')}
              </span>
            )}
          </div>
          <p className="m-0 text-[15px] opacity-70">
            {t('profile.since', { username: user.username, date: since })}
          </p>
          <p className="m-0 mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            <span>
              <b className="text-xl">{totalOf('ACTIVE')}</b>{' '}
              {t('profile.tabs.ACTIVE').toLowerCase()}
            </span>
            <span>
              <b className="text-xl">{totalOf('RESOLVED')}</b>{' '}
              {t('profile.tabs.RESOLVED').toLowerCase()}
            </span>
            <span>
              <b className="text-xl">{totalOf('EXPIRED')}</b>{' '}
              {t('profile.tabs.EXPIRED').toLowerCase()}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-bold text-ink"
          >
            {t('profile.edit')}
          </button>
          <Link
            href={`/users/${user.username}`}
            className="inline-flex h-12 items-center rounded-full border-[1.5px] border-on-ink px-5 text-sm font-bold text-on-ink no-underline"
          >
            {t('profile.publicProfile')}
          </Link>
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-[#fca5a5] px-5 text-sm font-bold text-[#fca5a5] disabled:opacity-60"
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            {t('nav.logOut')}
          </button>
        </div>
      </section>

      <div
        role="tablist"
        aria-label={t('profile.tabsLabel')}
        className="-mx-4 flex gap-1.5 self-stretch overflow-x-auto rounded-none px-4 md:mx-0 md:self-start md:rounded-full md:border md:border-border md:bg-paper md:p-[5px] [scrollbar-width:none]"
      >
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={tab === status}
            onClick={() => setTab(status)}
            className={cn(
              'h-11 shrink-0 rounded-full px-5 text-sm transition-colors duration-150',
              tab === status
                ? 'bg-ink font-bold text-on-ink'
                : 'border border-border bg-paper font-semibold text-body md:border-0 md:bg-transparent',
            )}
          >
            {t(`profile.tabs.${status}`)} · {totalOf(status)}
          </button>
        ))}
      </div>

      {current.isPending && (
        <div
          role="status"
          aria-busy="true"
          className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <span className="sr-only">{t('common.loading')}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <SlipSkeleton key={i} photo={i % 2 === 0} />
          ))}
        </div>
      )}

      {current.isSuccess && items.length === 0 && (
        <StateSlip
          icon={<Layers size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('profile.emptyTitle')}
          text={t('profile.emptyText')}
          action={
            tab === 'ACTIVE' ? (
              <Link href="/posts/new" className={pillClass('green', 'md')}>
                {t('profile.emptyAction')}
              </Link>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <>
          <SlipGrid posts={items} />
          {current.hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={current.isFetchingNextPage}
                onClick={() => current.fetchNextPage()}
                className={pillClass('outline', 'lg', 'h-[52px] text-[15px]')}
              >
                {t('profile.showMore')}
              </button>
            </div>
          )}
        </>
      )}

      <EditProfileDialog user={user} open={editing} onOpenChange={setEditing} />
    </main>
  );
}

/** The profile placeholder: same shape as the page. */
export function ProfileSkeleton() {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-2 md:px-6 md:pt-8"
    >
      <span className="sr-only">{t('loading')}</span>
      <div className="skeleton h-[156px] rounded-[28px]" />
      <div className="skeleton h-12 w-80 rounded-full" />
      <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SlipSkeleton key={i} photo={i % 2 === 0} />
        ))}
      </div>
    </div>
  );
}
