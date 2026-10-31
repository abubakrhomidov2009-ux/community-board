'use client';

import {
  ArrowLeft,
  Heart,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  Stamp,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { pillClass } from '@/components/shared/pill-button';
import { useSession } from '@/features/auth/queries';
import { CommentsSection } from '@/features/comments/components/CommentsSection';
import { useToggleFavorite } from '@/features/favorites/mutations';
import { Link, useRouter } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { scaleIn } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { KIND_OF, priceText, timeAgo, type Translate } from '../format';
import { useDeletePost, useRenewPost, useResolvePost } from '../mutations';
import { usePost } from '../queries';
import { ImageGallery } from './ImageGallery';

const TEXT = {
  lost: { strip: 'bg-lost', label: 'text-lost-ink' },
  tutor: { strip: 'bg-tutor', label: 'text-tutor-ink' },
  rent: { strip: 'bg-rent', label: 'text-rent-ink' },
  other: { strip: 'bg-other', label: 'text-other-ink' },
} as const;

const STAMP = {
  RESOLVED: 'border-stamp-resolved text-stamp-resolved',
  EXPIRED: 'border-stamp-expired text-stamp-expired',
  REMOVED: 'border-stamp-scam text-stamp-scam',
} as const;

const DAY = 86_400_000;

const initials = (username: string) => username.slice(0, 2).toUpperCase();

/** The post page. Design: PostDesktop and PostMobile. */
export function PostDetail({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const session = useSession();
  const remove = useDeletePost();
  // After the slip is taken down the page must not ask for it again (that would be a 404 flash).
  const post = usePost(id, !remove.isSuccess);
  const favorite = useToggleFavorite();
  const resolve = useResolvePost();
  const renew = useRenewPost();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // "Now" is read once when the page opens (the days left do not need to tick).
  const [now] = useState(() => Date.now());

  if (post.isPending) return <PostDetailSkeleton />;
  if (post.isError) {
    if (toApiError(post.error).statusCode === 404) notFound();
    return (
      <main id="main" className="mx-auto max-w-[720px] px-5 py-16 text-center">
        <p role="alert" className="text-base text-body">
          {t('errors.UNKNOWN')}
        </p>
        <button
          type="button"
          onClick={() => post.refetch()}
          className={pillClass('ink', 'md', 'mt-4')}
        >
          {t('common.retry')}
        </button>
      </main>
    );
  }

  const data = post.data;
  const kind = KIND_OF[data.category];
  const isOwner = session.user?.username === data.author.username;
  const msLeft = new Date(data.expiresAt).getTime() - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY));
  const active = data.status === 'ACTIVE';
  const canRenew = isOwner && (data.status === 'EXPIRED' || (active && msLeft <= 3 * DAY));
  const translate: Translate = (key, values) => t(key as never, values as never);
  const sortedPhone = data.contactPhone;
  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(data.createdAt),
  );
  const actionError =
    (resolve.error ?? renew.error ?? favorite.error)
      ? toApiError(resolve.error ?? renew.error ?? favorite.error).errorCode
      : '';
  const actionText = actionError
    ? t.has(`errors.${actionError}` as never)
      ? t(`errors.${actionError}` as never)
      : t('errors.UNKNOWN')
    : '';

  const tabBase =
    'flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-bold no-underline md:flex-col';

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1200px] flex-col gap-5 pb-36 md:gap-6 md:px-6 md:pb-16 md:pt-7"
    >
      <Link
        href="/posts"
        className="mx-4 mt-1 flex h-10 items-center gap-1.5 self-start rounded-full border border-border bg-paper px-4 text-sm font-semibold text-ink no-underline md:mx-0 md:mt-0"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {t('post.back')}
      </Link>

      <div className="flex flex-col gap-0 md:flex-row md:items-start md:gap-8">
        <div className="min-w-0 md:flex-[999_1_520px]">
          <ImageGallery images={data.images} category={data.category} />
        </div>

        <motion.article
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="relative -mt-7 mx-3 rounded-[8px_8px_24px_24px] border border-border bg-paper md:mx-0 md:mt-0 md:max-w-[440px] md:flex-[1_1_360px] md:rotate-[0.6deg]"
        >
          <span
            aria-hidden="true"
            className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full"
          />
          <div className={cn('h-2 rounded-[7px_7px_0_0]', TEXT[kind].strip)} />
          <div className="flex flex-col gap-3.5 p-[18px] md:p-[22px_24px]">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.9px] md:text-xs',
                  TEXT[kind].label,
                )}
              >
                <span className={cn('size-2 rounded-full', TEXT[kind].strip)} />
                {t(`category.${data.category}`)}
              </span>
              <span className="text-xs text-muted md:text-[13px]">
                {timeAgo(data.createdAt, locale)}
                {active && ` · ${t('post.daysLeft', { count: daysLeft })}`}
              </span>
            </div>
            <h1 className="m-0 font-display text-[20px] font-bold leading-[1.25] tracking-[-0.4px] [overflow-wrap:anywhere] md:text-[26px] md:leading-[1.2] md:tracking-[-0.6px]">
              {data.title}
            </h1>
            <p className="m-0 text-2xl font-bold text-primary md:text-[30px]">
              {priceText(data, translate, locale)}
            </p>
            <p className="m-0 flex items-center gap-2 text-sm text-body md:text-[15px]">
              <MapPin size={17} strokeWidth={2} aria-hidden="true" />
              {t(`district.${data.district}`)}
            </p>

            <Link
              href={`/users/${data.author.username}`}
              className="flex items-center gap-3 rounded-2xl bg-soft p-3 text-ink no-underline"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-note text-[15px] font-bold text-note-ink">
                {initials(data.author.username)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1 text-[15px] font-bold">
                  {data.author.username}
                  {data.author.isStudentVerified && (
                    <span className="ml-1 rounded-[5px] border-[1.5px] border-stamp-student px-[5px] py-px text-[11px] font-bold uppercase text-stamp-student">
                      {t('post.student')}
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-muted">
                  {t('post.authorSince', { date: since })}
                </span>
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr] border-t-[1.5px] border-dashed border-line md:grid-cols-3">
            {data.contactTelegram ? (
              <a
                href={`https://t.me/${data.contactTelegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  tabBase,
                  'flex-row gap-2 rounded-bl-[23px] border-r-[1.5px] border-dashed border-line bg-primary text-on-primary md:flex-col md:gap-1',
                )}
              >
                <Send size={18} strokeWidth={2} aria-hidden="true" />
                {t('post.telegram')}
              </a>
            ) : (
              <span
                className={cn(tabBase, 'border-r-[1.5px] border-dashed border-line text-muted')}
              >
                <Send size={18} strokeWidth={2} aria-hidden="true" />
                {t('post.telegram')}
              </span>
            )}
            {sortedPhone ? (
              <a
                href={`tel:${sortedPhone}`}
                aria-label={t('slip.callLabel')}
                className={cn(tabBase, 'border-r-[1.5px] border-dashed border-line text-ink')}
              >
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                <span className="hidden md:inline">{t('post.call')}</span>
              </a>
            ) : (
              <span
                className={cn(tabBase, 'border-r-[1.5px] border-dashed border-line text-muted')}
              >
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                <span className="hidden md:inline">{t('post.call')}</span>
              </span>
            )}
            <button
              type="button"
              aria-pressed={data.isFavorite}
              aria-label={data.isFavorite ? t('slip.unsaveLabel') : t('slip.saveLabel')}
              onClick={() => favorite.mutate({ id: data.id, save: !data.isFavorite })}
              className={cn(
                tabBase,
                'cursor-pointer border-0 bg-transparent',
                data.isFavorite ? 'text-danger' : 'text-ink',
              )}
            >
              <Heart
                size={18}
                strokeWidth={2}
                fill={data.isFavorite ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span className="hidden md:inline">
                {data.isFavorite ? t('post.saved') : t('post.save')}
              </span>
            </button>
          </div>

          {data.status !== 'ACTIVE' && (
            <span
              className={cn(
                'absolute right-4 top-[92px] -rotate-[9deg] rounded-md border-[2.5px] bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] px-[11px] py-[5px] font-display text-[13px] font-bold uppercase tracking-[1.2px]',
                STAMP[data.status],
              )}
            >
              {t(`status.${data.status.toLowerCase()}` as never)}
            </span>
          )}
        </motion.article>
      </div>

      <div className="mx-4 flex flex-col gap-4 md:mx-0 md:max-w-[calc(100%-472px)] md:min-w-[520px]">
        {isOwner && (
          <div className="flex flex-col gap-3 rounded-[20px] border border-note-border bg-note p-4 text-note-ink">
            <p className="m-0 text-sm font-bold">{t('post.yourSlip')}</p>
            {data.status === 'EXPIRED' && <p className="m-0 text-sm">{t('post.expiredNote')}</p>}
            {data.status === 'RESOLVED' && <p className="m-0 text-sm">{t('post.resolvedNote')}</p>}
            {data.status === 'REMOVED' && <p className="m-0 text-sm">{t('post.removedNote')}</p>}
            {active && canRenew && <p className="m-0 text-sm">{t('post.soonNote')}</p>}
            <div className="flex flex-wrap gap-2">
              {data.status !== 'REMOVED' && (
                <Link
                  href={`/posts/${data.id}/edit`}
                  className={pillClass('outline', 'md', 'gap-2')}
                >
                  <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  {t('post.edit')}
                </Link>
              )}
              {active && (
                <button
                  type="button"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate(data.id)}
                  className={pillClass('green', 'md', 'gap-2')}
                >
                  <Stamp size={16} strokeWidth={2} aria-hidden="true" />
                  {t('post.resolve')}
                </button>
              )}
              {canRenew && (
                <button
                  type="button"
                  disabled={renew.isPending}
                  onClick={() => renew.mutate(data.id)}
                  className={pillClass('ink', 'md', 'gap-2')}
                >
                  <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                  {t('post.renew')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-danger bg-paper px-[22px] text-sm font-bold text-danger"
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                {t('post.delete')}
              </button>
            </div>
          </div>
        )}
        {actionText && (
          <p role="alert" className="m-0 text-sm font-semibold text-danger">
            {actionText}
          </p>
        )}

        <section className="flex flex-col gap-2.5 rounded-[24px] border border-border bg-paper p-5 md:p-[26px]">
          <h2 className="m-0 font-display text-lg font-bold">{t('post.aboutTitle')}</h2>
          <p className="m-0 whitespace-pre-line text-base leading-[1.7] text-body [overflow-wrap:anywhere]">
            {data.description}
          </p>
          {!data.contactTelegram && !data.contactPhone && (
            <p className="m-0 text-sm text-muted">{t('post.noContact')}</p>
          )}
        </section>

        <CommentsSection postId={data.id} authorUsername={data.author.username} canWrite={active} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('post.deleteTitle')}
        text={t('post.deleteText')}
        confirmLabel={t('post.deleteConfirm')}
        pending={remove.isPending}
        error={
          remove.isError
            ? t.has(`errors.${toApiError(remove.error).errorCode}` as never)
              ? t(`errors.${toApiError(remove.error).errorCode}` as never)
              : t('errors.UNKNOWN')
            : undefined
        }
        onConfirm={() =>
          remove.mutate(data.id, {
            onSuccess: () => {
              setConfirmOpen(false);
              router.replace('/posts');
            },
          })
        }
      />
    </main>
  );
}

/** The post page placeholder: same shape as the page. */
export function PostDetailSkeleton() {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pb-16 pt-2 md:flex-row md:gap-8 md:px-6 md:pt-7"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="aspect-[4/3] w-full rounded-[26px] md:flex-[999_1_520px]" />
      <div className="flex flex-col gap-3.5 rounded-[24px] border border-border bg-paper p-6 md:max-w-[440px] md:flex-[1_1_360px]">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-7 w-full rounded-full" />
        <Skeleton className="h-7 w-3/4 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
