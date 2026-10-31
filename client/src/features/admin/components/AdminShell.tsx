'use client';

import { LayoutDashboard, Flag, Layers, Users, ArrowLeft, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import { StateSlip } from '@/components/shared/StateSlip';
import { pillClass } from '@/components/shared/pill-button';
import { RequireSession } from '@/features/auth/components/RequireSession';
import { useSession } from '@/features/auth/queries';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAdminStats } from '../queries';

const ITEMS = [
  { href: '/admin', key: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/reports', key: 'reports', icon: Flag, exact: false },
  { href: '/admin/posts', key: 'slips', icon: Layers, exact: false },
  { href: '/admin/users', key: 'users', icon: Users, exact: false },
] as const;

/** The admin area: a dark rail on a laptop, a top strip on a phone. Only admins get in. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireSession fallback={<AdminSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </RequireSession>
  );
}

function AdminGate({ children }: { children: ReactNode }) {
  const t = useTranslations('admin');
  const session = useSession();
  const pathname = usePathname();
  const stats = useAdminStats();
  const user = session.user;
  if (!user) return <AdminSkeleton />;

  if (user.role === 'USER') {
    return (
      <main id="main" className="mx-auto max-w-[720px] px-4 py-16">
        <StateSlip
          icon={<ShieldAlert size={36} strokeWidth={1.6} aria-hidden="true" />}
          title={t('forbiddenTitle')}
          text={t('forbiddenText')}
          action={
            <Link href="/posts" className={pillClass('ink', 'md')}>
              {t('backToBoard')}
            </Link>
          }
        />
      </main>
    );
  }

  const open = stats.data?.reportsOpen ?? 0;
  const active = (item: (typeof ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-[260px] shrink-0 p-4 md:block">
        <nav
          aria-label={t('title')}
          className="sticky top-4 flex min-h-[calc(100dvh-32px)] flex-col gap-1.5 rounded-[28px] bg-[#0e1a17] p-[20px_14px] text-white"
        >
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-2 pb-[18px] text-white no-underline"
          >
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={30}
              height={30}
              className="rounded-full"
            />
            <span className="font-display text-[15px] font-bold">{t('title')}</span>
          </Link>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item) ? 'page' : undefined}
              className={cn(
                'flex h-[46px] items-center gap-3 rounded-full px-3.5 text-sm font-bold no-underline',
                active(item) ? 'bg-white text-[#0e1a17]' : 'text-[#c9d6d2] hover:text-white',
              )}
            >
              <item.icon size={18} strokeWidth={2} aria-hidden="true" />
              {t(item.key)}
              {item.key === 'reports' && open > 0 && (
                <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-pin px-1.5 text-xs font-bold text-[#3b2203]">
                  {open}
                </span>
              )}
            </Link>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-[#3a4a46] p-3">
            <Avatar username={user.username} avatarUrl={user.avatarUrl} size={36} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-bold">@{user.username}</span>
              <span className="text-[11px] font-bold tracking-[0.6px] text-[#fbbf24]">
                {user.role === 'SUPER_ADMIN' ? t('superAdmin') : t('adminRole')}
              </span>
            </span>
          </div>
          <Link
            href="/posts"
            className="flex h-11 items-center gap-2.5 rounded-full px-3.5 text-sm font-semibold text-[#a7b8b3] no-underline hover:text-white"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {t('backToBoard')}
          </Link>
        </nav>
      </aside>

      <header className="sticky top-0 z-30 flex flex-col gap-2 bg-[#0e1a17] px-3 pb-3 pt-3 text-white md:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/posts"
            className="flex h-10 items-center gap-1.5 text-sm font-semibold text-[#c9d6d2] no-underline"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {t('backToBoard')}
          </Link>
          <span className="font-display text-sm font-bold">{t('title')}</span>
        </div>
        <nav aria-label={t('title')} className="grid grid-cols-4 gap-1">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item) ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center justify-center gap-1 rounded-full text-[13px] font-bold no-underline',
                active(item) ? 'bg-white text-[#0e1a17]' : 'text-[#c9d6d2]',
              )}
            >
              {t(item.key)}
              {item.key === 'reports' && open > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pin px-1 text-[11px] font-bold text-[#3b2203]">
                  {open}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <div className="min-w-0 flex-1 px-4 pb-16 pt-5 md:pb-12 md:pl-4 md:pr-8 md:pt-8">
        {children}
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  const t = useTranslations('common');
  return (
    <div role="status" aria-busy="true" className="flex min-h-dvh gap-4 p-4">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="hidden h-[calc(100dvh-32px)] w-[240px] rounded-[28px] md:block" />
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <Skeleton className="h-10 w-56 rounded-full" />
        <Skeleton className="h-32 rounded-[24px]" />
        <Skeleton className="h-64 rounded-[24px]" />
      </div>
    </div>
  );
}

/** Title block used by every admin page. */
export function AdminHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <p className="m-0 text-sm font-semibold text-body-2">{eyebrow}</p>}
        <h1 className="m-0 font-display text-[28px] font-bold tracking-[-1px] md:text-[40px] md:tracking-[-1.2px]">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
