'use client';

import { Layers } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar } from '@/components/shared/Avatar';
import { SlipSkeleton } from '@/components/shared/PostSlip';
import { StateSlip } from '@/components/shared/StateSlip';
import { pillClass } from '@/components/shared/pill-button';
import { SlipGrid } from '@/features/posts/components/SlipGrid';
import { toApiError } from '@/lib/api/errors';
import { usePublicUser, useUserPosts } from '../queries';
import { ProfileSkeleton } from './ProfilePage';

/** Someone else's public profile. Design: UserDesktop, UserMobile. */
export function UserPage({ username }: { username: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const user = usePublicUser(username);
  const posts = useUserPosts(username);

  if (user.isPending) return <ProfileSkeleton />;
  if (user.isError) {
    if (toApiError(user.error).statusCode === 404) notFound();
    return (
      <p role="alert" className="mx-auto max-w-[720px] px-5 py-16 text-center text-base text-body">
        {t('errors.UNKNOWN')}
      </p>
    );
  }

  const data = user.data;
  const items = posts.data?.pages.flatMap((page) => page.items) ?? [];
  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(data.createdAt),
  );

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-36 pt-2 md:gap-7 md:px-6 md:pb-16 md:pt-8"
    >
      <section className="flex flex-wrap items-center gap-5 rounded-[28px] border border-border bg-paper p-6 md:gap-6 md:p-[30px_32px]">
        <Avatar
          username={data.username}
          avatarUrl={data.avatarUrl}
          size={96}
          className="font-display"
        />
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-display text-[26px] font-bold tracking-[-0.8px] [overflow-wrap:anywhere] md:text-[32px]">
              {data.username}
            </h1>
            {data.isStudentVerified && (
              <span className="-rotate-[4deg] rounded-md border-2 border-stamp-student px-2 py-0.5 font-display text-[11px] font-bold uppercase text-stamp-student">
                {t('post.student')}
              </span>
            )}
          </div>
          <p className="m-0 text-[15px] text-body-2">
            {t('profile.userSince', {
              username: data.username,
              date: since,
              count: data.activePostsCount,
            })}
          </p>
        </div>
      </section>

      <h2 className="m-0 font-display text-[22px] font-bold">
        {t('profile.pinnedBy', { name: data.username })}
      </h2>

      {posts.isPending && (
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

      {posts.isSuccess && items.length === 0 && (
        <StateSlip
          icon={<Layers size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('profile.emptyTitle')}
          text={t('profile.noPosts', { name: data.username })}
        />
      )}

      {items.length > 0 && (
        <>
          <SlipGrid posts={items} />
          {posts.hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={posts.isFetchingNextPage}
                onClick={() => posts.fetchNextPage()}
                className={pillClass('outline', 'lg', 'h-[52px] text-[15px]')}
              >
                {t('profile.showMore')}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
