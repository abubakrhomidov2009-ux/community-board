'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { pillClass } from '@/components/shared/pill-button';
import { useSession } from '@/features/auth/queries';
import { priceText, type Translate } from '@/features/posts/format';
import { Link } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { Pill, PostStatusBadge, ReportStatusBadge, RoleBadge, errorMessage } from './AdminParts';
import { AdminHeading } from './AdminShell';
import {
  useAdminPost,
  useAdminUser,
  useDismissPostReports,
  useRemovePost,
  useRestorePost,
  useUserAction,
} from '../queries';

const card = 'flex flex-col gap-3 rounded-[24px] border border-border bg-paper p-5 md:p-6';
const h2 = 'm-0 font-display text-[17px] font-bold';

const dateTime = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-[0.6px] text-muted">{label}</dt>
          <dd className="m-0 text-[15px] font-semibold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-48 rounded-[24px]" />
      <Skeleton className="h-48 rounded-[24px]" />
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-paper px-4 text-sm font-semibold text-ink no-underline"
    >
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      {label}
    </Link>
  );
}

/** The admin post page: everything about one slip, its reports and its author, and the actions. */
export function AdminPostDetail({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const session = useSession();
  const post = useAdminPost(id);
  const remove = useRemovePost(id);
  const restore = useRestorePost(id);
  const dismiss = useDismissPostReports(id);
  const block = useUserAction(post.data?.author.id ?? '');
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState('');

  if (post.isPending) return <DetailSkeleton />;
  if (post.isError) {
    if (toApiError(post.error).statusCode === 404) notFound();
    return <p role="alert">{t('errors.UNKNOWN')}</p>;
  }
  const p = post.data;
  const me = session.user;
  const authorIsStaff = p.author.role !== 'USER';
  // Admins cannot act on other admins; only the super admin can, and nobody on the super admin.
  const canActOnAuthor =
    p.author.role === 'USER' || (me?.role === 'SUPER_ADMIN' && p.author.role === 'ADMIN');
  const translate: Translate = (key, values) => t(key as never, values as never);
  const openReports = p.reports.filter((r) => r.status === 'OPEN').length;
  const actionError = remove.error ?? restore.error ?? dismiss.error ?? block.error;

  return (
    <>
      <BackLink href="/admin/posts" label={t('admin.slips')} />
      <AdminHeading eyebrow={`${t('admin.postId')}: ${p.id}`} title={p.title}>
        <PostStatusBadge status={p.status} />
      </AdminHeading>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <h2 className={h2}>{t('admin.details')}</h2>
            <Facts
              items={[
                [t('admin.category'), t(`category.${p.category}`)],
                [t('board.where'), t(`district.${p.district}`)],
                [
                  t('admin.price'),
                  priceText({ price: p.price, priceUnit: p.priceUnit } as never, translate, locale),
                ],
                [
                  t('admin.contact'),
                  [p.contactTelegram && `@${p.contactTelegram}`, p.contactPhone]
                    .filter(Boolean)
                    .join(' · ') || '–',
                ],
                [t('admin.created'), dateTime(p.createdAt, locale)],
                [t('admin.expires'), dateTime(p.expiresAt, locale)],
              ]}
            />
            {p.removedReason && (
              <p className="m-0 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">
                {t('admin.removedBecause')}: {p.removedReason}
              </p>
            )}
            <p className="m-0 whitespace-pre-line text-[15px] leading-[1.65] text-body [overflow-wrap:anywhere]">
              {p.description}
            </p>
            {p.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {p.images.map((image) => (
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden rounded-2xl bg-soft"
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="140px"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className={h2}>
              {t('admin.reportsTitle')} <span className="text-muted">{p.reports.length}</span>
            </h2>
            {p.reports.length === 0 && (
              <p className="m-0 text-body-2">{t('admin.noReportsOnSlip')}</p>
            )}
            {p.reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-1 border-t-[1.5px] border-dashed border-line pt-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="amber">{t(`report.reasons.${r.reason}`)}</Pill>
                  <ReportStatusBadge status={r.status} />
                  <span className="text-[13px] text-muted">{dateTime(r.createdAt, locale)}</span>
                </div>
                <p className="m-0 text-sm">
                  <Link href={`/admin/users/${r.reporter.id}`} className="font-bold">
                    {r.reporter.username}
                  </Link>
                  {r.details && <> — {r.details}</>}
                </p>
              </div>
            ))}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <h2 className={h2}>{t('admin.actions')}</h2>
            <div className="flex flex-col gap-2.5">
              {p.status !== 'REMOVED' && canActOnAuthor && (
                <button
                  type="button"
                  onClick={() => setRemoving(true)}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-danger px-5 text-[15px] font-bold text-white"
                >
                  {t('admin.remove')}
                </button>
              )}
              {p.status === 'REMOVED' && canActOnAuthor && (
                <button
                  type="button"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate()}
                  className={pillClass('green', 'lg', 'h-12 text-[15px]')}
                >
                  {t('admin.restore')}
                </button>
              )}
              {openReports > 0 && canActOnAuthor && (
                <button
                  type="button"
                  disabled={dismiss.isPending}
                  onClick={() => dismiss.mutate()}
                  className={pillClass('outline', 'lg', 'h-12 text-[15px]')}
                >
                  {t('admin.dismissAll')}
                </button>
              )}
              {canActOnAuthor && (
                <button
                  type="button"
                  disabled={block.isPending}
                  onClick={() => block.mutate(p.author.isBlocked ? 'unblock' : 'block')}
                  className={pillClass('outline', 'lg', 'h-12 text-[15px]')}
                >
                  {p.author.isBlocked ? t('admin.unblockAuthor') : t('admin.blockAuthor')}
                </button>
              )}
              {p.status !== 'REMOVED' && (
                <Link
                  href={`/posts/${p.id}`}
                  className={pillClass('outline', 'lg', 'h-12 gap-2 text-[15px]')}
                >
                  <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
                  {t('admin.viewPublic')}
                </Link>
              )}
              {authorIsStaff && !canActOnAuthor && (
                <p className="m-0 text-[13px] text-muted">{t('admin.staffNote')}</p>
              )}
              {actionError && (
                <p role="alert" className="m-0 text-sm font-semibold text-danger">
                  {errorMessage(t, actionError)}
                </p>
              )}
            </div>
          </section>

          <section className={card}>
            <h2 className={h2}>{t('admin.authorTitle')}</h2>
            <Link href={`/admin/users/${p.author.id}`} className="text-base font-bold">
              {p.author.username}
            </Link>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={p.author.role} />
              <Pill tone={p.author.isBlocked ? 'red' : 'green'}>
                {p.author.isBlocked ? t('admin.userStatus.blocked') : t('admin.userStatus.active')}
              </Pill>
              {p.author.isStudentVerified && <Pill tone="blue">{t('post.student')}</Pill>}
            </div>
            <Facts
              items={[
                [t('auth.email'), p.author.email],
                [t('admin.joined'), dateTime(p.author.createdAt, locale)],
                [t('admin.posts'), p.author.postsCount],
                [t('admin.counts.reportsOnPosts'), p.author.reportsOnPostsCount],
              ]}
            />
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={t('admin.removeTitle')}
        text={t('admin.removeText')}
        confirmLabel={t('admin.confirmRemove')}
        pending={remove.isPending}
        error={remove.isError ? errorMessage(t, remove.error) : undefined}
        onConfirm={() =>
          remove.mutate(reason.trim() || undefined, {
            onSuccess: () => {
              setRemoving(false);
              setReason('');
            },
          })
        }
      >
        <label
          htmlFor="remove-reason"
          className="mt-4 block text-xs font-bold uppercase tracking-[0.8px] text-body-2"
        >
          {t('admin.removeReason')}
        </label>
        <textarea
          id="remove-reason"
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full resize-none rounded-2xl border-[1.5px] border-line bg-paper px-4 py-3 text-base text-ink focus:border-ink focus:outline-none"
        />
      </ConfirmDialog>
    </>
  );
}

/** The admin user page: who they are, their numbers, their slips, block and role buttons. */
export function AdminUserDetail({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const session = useSession();
  const user = useAdminUser(id);
  const action = useUserAction(id);

  if (user.isPending) return <DetailSkeleton />;
  if (user.isError) {
    if (toApiError(user.error).statusCode === 404) notFound();
    return <p role="alert">{t('errors.UNKNOWN')}</p>;
  }
  const u = user.data;
  const me = session.user;
  const isMe = me?.username === u.username;
  const isSuper = me?.role === 'SUPER_ADMIN';
  const canBlock = u.role === 'USER' || (isSuper && u.role === 'ADMIN');

  return (
    <>
      <BackLink href="/admin/users" label={t('admin.users')} />
      <AdminHeading eyebrow={`${t('admin.userId')}: ${u.id}`} title={u.username}>
        <div className="flex flex-wrap gap-2">
          <RoleBadge role={u.role} />
          <Pill tone={u.isBlocked ? 'red' : 'green'}>
            {u.isBlocked ? t('admin.userStatus.blocked') : t('admin.userStatus.active')}
          </Pill>
          {u.isStudentVerified && <Pill tone="blue">{t('post.student')}</Pill>}
        </div>
      </AdminHeading>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <h2 className={h2}>{t('admin.details')}</h2>
            <Facts
              items={[
                [t('auth.email'), u.email],
                [t('admin.joined'), dateTime(u.createdAt, locale)],
              ]}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['posts', 'reportsOnPosts', 'comments', 'removedPosts'] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1 rounded-2xl bg-soft p-3.5">
                  <span className="font-display text-2xl font-bold">{u.counts[key]}</span>
                  <span className="text-xs font-semibold text-body-2">
                    {t(`admin.counts.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={card}>
            <h2 className={h2}>
              {t('admin.theirSlips')} <span className="text-muted">{u.posts.length}</span>
            </h2>
            {u.posts.length === 0 && <p className="m-0 text-body-2">{t('admin.empty')}</p>}
            {u.posts.map((p) => (
              <Link
                key={p.id}
                href={`/admin/posts/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-dashed border-line pt-3 text-ink no-underline"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-bold [overflow-wrap:anywhere]">{p.title}</span>
                  <span className="text-[13px] text-muted">
                    {t(`category.${p.category}`)} · {dateTime(p.createdAt, locale)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {p.openReportsCount > 0 && <Pill tone="amber">{p.openReportsCount}</Pill>}
                  <PostStatusBadge status={p.status} />
                </span>
              </Link>
            ))}
          </section>
        </div>

        <section className={card}>
          <h2 className={h2}>{t('admin.actions')}</h2>
          <div className="flex flex-col gap-2.5">
            {canBlock && !isMe && (
              <button
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate(u.isBlocked ? 'unblock' : 'block')}
                className={
                  u.isBlocked
                    ? pillClass('green', 'lg', 'h-12 text-[15px]')
                    : 'inline-flex h-12 items-center justify-center rounded-full bg-danger px-5 text-[15px] font-bold text-white disabled:opacity-60'
                }
              >
                {u.isBlocked ? t('admin.unblock') : t('admin.block')}
              </button>
            )}
            {isSuper && u.role === 'USER' && (
              <button
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate('promote')}
                className={pillClass('ink', 'lg', 'h-12 text-[15px]')}
              >
                {t('admin.promote')}
              </button>
            )}
            {isSuper && u.role === 'ADMIN' && (
              <button
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate('demote')}
                className={pillClass('outline', 'lg', 'h-12 text-[15px]')}
              >
                {t('admin.demote')}
              </button>
            )}
            <Link
              href={`/users/${u.username}`}
              className={pillClass('outline', 'lg', 'h-12 gap-2 text-[15px]')}
            >
              <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
              {t('profile.publicProfile')}
            </Link>
            {u.role !== 'USER' && !isSuper && (
              <p className="m-0 text-[13px] text-muted">{t('admin.staffNote')}</p>
            )}
            {action.isError && (
              <p role="alert" className="m-0 text-sm font-semibold text-danger">
                {errorMessage(t, action.error)}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
