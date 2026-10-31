'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
import { pillClass } from '@/components/shared/pill-button';
import { timeAgo } from '@/features/posts/format';
import { Link } from '@/i18n/navigation';
import type { PostStatus, ReportStatus } from '../api';
import {
  useAdminPosts,
  useAdminReports,
  useAdminStats,
  useAdminUsers,
  useDismissReport,
} from '../queries';
import {
  Cell,
  DataTable,
  Pager,
  PostStatusBadge,
  ReportStatusBadge,
  Row,
  RoleBadge,
  SearchField,
  Segmented,
  Pill,
} from './AdminParts';
import { AdminHeading } from './AdminShell';

const dateOf = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 rounded-2xl" />
      ))}
    </div>
  );
}

function Empty() {
  const t = useTranslations('admin');
  return (
    <p className="m-0 rounded-[20px] border border-border bg-paper p-6 text-center text-body-2">
      {t('empty')}
    </p>
  );
}

/** Overview: numbers, slips by category (counts) and the newest reports. Design: AdminDashboardDesktop/Mobile. */
export function AdminDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const stats = useAdminStats();
  const reports = useAdminReports(1, 'OPEN');
  const cards = [
    { key: 'users', value: stats.data?.users },
    { key: 'activePosts', value: stats.data?.activePosts },
    { key: 'reportsOpen', value: stats.data?.reportsOpen, hot: true },
    { key: 'blockedUsers', value: stats.data?.blockedUsers },
  ] as const;

  return (
    <>
      <AdminHeading eyebrow={t('admin.weekLine')} title={t('admin.overview')} />
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={
              'flex flex-col gap-1.5 rounded-[24px] border border-border p-5 ' +
              ('hot' in card && card.hot && (card.value ?? 0) > 0
                ? 'bg-ink text-on-ink'
                : 'bg-paper')
            }
          >
            <span className="text-[13px] font-semibold opacity-85">
              {t(`admin.stats.${card.key}`)}
            </span>
            {stats.isPending ? (
              <Skeleton className="h-10 w-16 rounded-full" />
            ) : (
              <span className="font-display text-4xl font-bold">{card.value ?? 0}</span>
            )}
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-1 rounded-[24px] border border-border bg-paper p-5 md:p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="m-0 font-display text-[17px] font-bold">{t('admin.newestReports')}</h2>
          <Link href="/admin/reports" className="text-sm font-bold">
            {t('admin.seeAll')}
          </Link>
        </div>
        {reports.isPending && <ListSkeleton />}
        {reports.isSuccess && reports.data.items.length === 0 && (
          <p className="m-0 text-body-2">{t('admin.noReports')}</p>
        )}
        {reports.data?.items.slice(0, 5).map((r) => (
          <Link
            key={r.id}
            href={`/admin/posts/${r.post.id}`}
            className="flex items-center justify-between gap-3 border-t-[1.5px] border-dashed border-line py-3 text-ink no-underline"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-bold">{r.post.title}</span>
              <span className="text-[13px] text-muted">
                {t(`report.reasons.${r.reason}`)} · {r.reporter.username} ·{' '}
                {timeAgo(r.createdAt, locale)}
              </span>
            </span>
            <ReportStatusBadge status={r.status} />
          </Link>
        ))}
      </section>
    </>
  );
}

/** Reports. Design: AdminReportsDesktop/Mobile. */
export function AdminReports() {
  const t = useTranslations();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | 'ALL'>('OPEN');
  const reports = useAdminReports(page, status === 'ALL' ? undefined : status);
  const dismiss = useDismissReport();

  return (
    <>
      <AdminHeading title={t('admin.reports')} />
      <div className="mb-4">
        <Segmented
          label={t('admin.status')}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'OPEN', label: t('admin.reportStatus.OPEN') },
            { value: 'RESOLVED', label: t('admin.reportStatus.RESOLVED') },
            { value: 'DISMISSED', label: t('admin.reportStatus.DISMISSED') },
            { value: 'ALL', label: t('admin.all') },
          ]}
        />
      </div>
      {reports.isPending && <ListSkeleton />}
      {reports.isSuccess && reports.data.items.length === 0 && <Empty />}
      {reports.isSuccess && reports.data.items.length > 0 && (
        <DataTable
          head={[
            t('admin.slip'),
            t('admin.reason'),
            t('admin.reporter'),
            t('admin.date'),
            t('admin.status'),
            '',
          ]}
        >
          {reports.data.items.map((r) => (
            <Row key={r.id}>
              <Cell>
                <Link
                  href={`/admin/posts/${r.post.id}`}
                  className="font-bold text-ink [overflow-wrap:anywhere]"
                >
                  {r.post.title}
                </Link>
              </Cell>
              <Cell label={t('admin.reason')}>
                <Pill tone="amber">{t(`report.reasons.${r.reason}`)}</Pill>
              </Cell>
              <Cell label={t('admin.reporter')}>
                <Link href={`/admin/users/${r.reporter.id}`}>{r.reporter.username}</Link>
              </Cell>
              <Cell label={t('admin.date')}>{dateOf(r.createdAt, locale)}</Cell>
              <Cell>
                <ReportStatusBadge status={r.status} />
              </Cell>
              <Cell className="md:text-right">
                <span className="flex flex-wrap gap-2 md:justify-end">
                  <Link
                    href={`/admin/posts/${r.post.id}`}
                    className={pillClass('outline', 'md', 'h-9 px-4 text-[13px]')}
                  >
                    {t('admin.view')}
                  </Link>
                  {r.status === 'OPEN' && (
                    <button
                      type="button"
                      disabled={dismiss.isPending}
                      onClick={() => dismiss.mutate(r.id)}
                      className={pillClass('ink', 'md', 'h-9 px-4 text-[13px]')}
                    >
                      {t('admin.dismiss')}
                    </button>
                  )}
                </span>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}
      {reports.data && (
        <Pager page={page} totalPages={reports.data.totalPages} onChange={setPage} />
      )}
    </>
  );
}

/** All slips, any status. Design: AdminPostsDesktop/Mobile. */
export function AdminPosts() {
  const t = useTranslations();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PostStatus | 'ALL'>('ALL');
  const posts = useAdminPosts(page, q, status === 'ALL' ? undefined : status);

  return (
    <>
      <AdminHeading title={t('admin.slips')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          label={t('admin.search')}
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        <Segmented
          label={t('admin.status')}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: t('admin.all') },
            { value: 'ACTIVE', label: t('admin.postStatus.ACTIVE') },
            { value: 'REMOVED', label: t('admin.postStatus.REMOVED') },
            { value: 'EXPIRED', label: t('admin.postStatus.EXPIRED') },
          ]}
        />
      </div>
      {posts.isPending && <ListSkeleton />}
      {posts.isSuccess && posts.data.items.length === 0 && <Empty />}
      {posts.isSuccess && posts.data.items.length > 0 && (
        <DataTable
          head={[
            t('admin.slip'),
            t('admin.category'),
            t('admin.author'),
            t('admin.status'),
            t('admin.openReports'),
            t('admin.date'),
            '',
          ]}
        >
          {posts.data.items.map((p) => (
            <Row key={p.id}>
              <Cell>
                <Link
                  href={`/admin/posts/${p.id}`}
                  className="font-bold text-ink [overflow-wrap:anywhere]"
                >
                  {p.title}
                </Link>
              </Cell>
              <Cell label={t('admin.category')}>{t(`category.${p.category}`)}</Cell>
              <Cell label={t('admin.author')}>
                <Link href={`/admin/users/${p.author.id}`}>{p.author.username}</Link>
              </Cell>
              <Cell>
                <PostStatusBadge status={p.status} />
              </Cell>
              <Cell label={t('admin.openReports')}>
                {p.openReportsCount > 0 ? <Pill tone="amber">{p.openReportsCount}</Pill> : '–'}
              </Cell>
              <Cell label={t('admin.date')}>{dateOf(p.createdAt, locale)}</Cell>
              <Cell className="md:text-right">
                <Link
                  href={`/admin/posts/${p.id}`}
                  className={pillClass('outline', 'md', 'h-9 px-4 text-[13px]')}
                >
                  {t('admin.view')}
                </Link>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}
      {posts.data && <Pager page={page} totalPages={posts.data.totalPages} onChange={setPage} />}
    </>
  );
}

/** All users with a role filter. Design: AdminUsersDesktop/Mobile. */
export function AdminUsers() {
  const t = useTranslations();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'USER' | 'ADMIN' | 'BLOCKED'>('ALL');
  const users = useAdminUsers(
    page,
    q,
    filter === 'USER' || filter === 'ADMIN' ? filter : undefined,
    filter === 'BLOCKED' ? true : undefined,
  );

  return (
    <>
      <AdminHeading title={t('admin.users')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          label={t('admin.search')}
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        <Segmented
          label={t('admin.role')}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: t('admin.all') },
            { value: 'USER', label: t('admin.filterUsers') },
            { value: 'ADMIN', label: t('admin.filterAdmins') },
            { value: 'BLOCKED', label: t('admin.userStatus.blocked') },
          ]}
        />
      </div>
      {users.isPending && <ListSkeleton />}
      {users.isSuccess && users.data.items.length === 0 && <Empty />}
      {users.isSuccess && users.data.items.length > 0 && (
        <DataTable
          head={[
            t('admin.user'),
            t('auth.email'),
            t('admin.role'),
            t('admin.status'),
            t('admin.posts'),
            t('admin.joined'),
            '',
          ]}
        >
          {users.data.items.map((u) => (
            <Row key={u.id}>
              <Cell>
                <Link href={`/admin/users/${u.id}`} className="font-bold text-ink">
                  {u.username}
                </Link>
                {u.isStudentVerified && (
                  <span className="ml-2 text-xs font-bold text-stamp-student">
                    {t('post.student')}
                  </span>
                )}
              </Cell>
              <Cell label={t('auth.email')} className="[overflow-wrap:anywhere]">
                {u.email}
              </Cell>
              <Cell>
                <RoleBadge role={u.role} />
              </Cell>
              <Cell>
                <Pill tone={u.isBlocked ? 'red' : 'green'}>
                  {u.isBlocked ? t('admin.userStatus.blocked') : t('admin.userStatus.active')}
                </Pill>
              </Cell>
              <Cell label={t('admin.posts')}>{u.postsCount}</Cell>
              <Cell label={t('admin.joined')}>{dateOf(u.createdAt, locale)}</Cell>
              <Cell className="md:text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className={pillClass('outline', 'md', 'h-9 px-4 text-[13px]')}
                >
                  {t('admin.view')}
                </Link>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}
      {users.data && <Pager page={page} totalPages={users.data.totalPages} onChange={setPage} />}
    </>
  );
}
