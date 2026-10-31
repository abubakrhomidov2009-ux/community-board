'use client';

import { LogOut, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher';
import { pillClass } from '@/components/shared/pill-button';
import { useLogoutMutation } from '@/features/auth/mutations';
import { useSession } from '@/features/auth/queries';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { useRequestUniversityEmail } from '../mutations';
import { EditProfileDialog } from './EditProfileDialog';

const LOCALES: Locale[] = ['tg', 'ru', 'en'];

const card = 'flex flex-col gap-3.5 rounded-[24px] border border-border bg-paper p-5 md:p-[26px]';
const cardTitle = 'm-0 font-display text-lg font-bold';

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(card, className)}>
      <h2 className={cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Settings: account, appearance, language, university email, admin panel link, log out. Design: SettingsDesktop/Mobile. */
export function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const session = useSession();
  const logout = useLogoutMutation();
  const request = useRequestUniversityEmail();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');

  const user = session.user;
  if (!user) return <SettingsSkeleton />;

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const code = request.isError ? toApiError(request.error).errorCode : '';
  const emailError = code
    ? t.has(`errors.${code}` as never)
      ? t(`errors.${code}` as never)
      : t('errors.UNKNOWN')
    : '';

  function sendLink(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    request.mutate(value, { onSuccess: () => setSentTo(value) });
  }

  const choice = (active: boolean) =>
    cn(
      'h-[46px] rounded-full text-[15px] transition-colors duration-150',
      active ? 'bg-ink font-bold text-on-ink' : 'font-semibold text-body',
    );

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[820px] flex-col gap-4 px-4 pb-36 pt-2 md:gap-[18px] md:px-6 md:pb-16 md:pt-9"
    >
      <h1 className="m-0 mb-1.5 font-display text-[30px] font-bold tracking-[-1px] md:text-[40px] md:tracking-[-1.2px]">
        {t('settings.title')}
      </h1>

      <Section title={t('settings.account')}>
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold uppercase tracking-[0.8px] text-body-2">
              {t('profile.username')}
            </dt>
            <dd className="m-0 text-base font-semibold">{user.username}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold uppercase tracking-[0.8px] text-body-2">
              {t('auth.email')}
            </dt>
            <dd className="m-0 text-base font-semibold [overflow-wrap:anywhere]">{user.email}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={pillClass('ink', 'md', 'self-start text-sm')}
        >
          {t('profile.edit')}
        </button>
      </Section>

      <Section title={t('settings.appearance')}>
        <ThemeSwitcher className="self-start" />
      </Section>

      <Section title={t('nav.language')}>
        <div
          role="group"
          aria-label={t('nav.language')}
          className="grid grid-cols-3 gap-1.5 rounded-full bg-soft p-1.5"
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={code === locale}
              onClick={() => {
                if (code !== locale)
                  router.replace(search ? `${pathname}?${search}` : pathname, { locale: code });
              }}
              className={choice(code === locale)}
            >
              {t(`nav.languageName.${code}`)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.universityTitle')} className="relative">
        {user.isStudentVerified && (
          <span className="absolute right-5 top-5 -rotate-6 rounded-md border-[2.5px] border-primary px-2.5 py-[3px] font-display text-xs font-bold uppercase tracking-[1px] text-primary md:right-[26px] md:top-[22px]">
            {t('settings.verified')}
          </span>
        )}
        <p className="m-0 text-[15px] leading-[1.55] text-body">{t('settings.universityText')}</p>
        {user.universityEmail && (
          <p className="m-0 text-sm font-semibold">{user.universityEmail}</p>
        )}
        {!user.isStudentVerified && (
          <form onSubmit={sendLink} noValidate className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2.5">
              <label htmlFor="uni-email" className="sr-only">
                {t('settings.universityEmail')}
              </label>
              <input
                id="uni-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('settings.universityPlaceholder')}
                className="h-[50px] min-w-0 flex-[1_1_240px] rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <button
                type="submit"
                disabled={request.isPending || email.trim() === ''}
                className={pillClass('outline', 'md', 'h-[50px]')}
              >
                {sentTo ? t('settings.sendAgain') : t('settings.sendLink')}
              </button>
            </div>
            {sentTo && (
              <p role="status" className="m-0 text-sm font-semibold text-primary">
                {t('settings.checkInbox', { email: sentTo })}
              </p>
            )}
            {emailError && (
              <p role="alert" className="m-0 text-sm font-semibold text-danger">
                {emailError}
              </p>
            )}
            <p className="m-0 text-[13px] text-muted">{t('settings.spamNote')}</p>
          </form>
        )}
      </Section>

      {isAdmin && (
        <section className={cn(card, 'sm:flex-row sm:items-center sm:justify-between')}>
          <div className="flex flex-col gap-1">
            <h2 className={cardTitle}>{t('nav.adminPanel')}</h2>
            <p className="m-0 text-sm text-body-2">{t('settings.adminText')}</p>
          </div>
          <Link href="/admin" className={pillClass('ink', 'md', 'gap-2 self-start')}>
            <ShieldCheck size={17} strokeWidth={2} aria-hidden="true" />
            {t('settings.openAdmin')}
          </Link>
        </section>
      )}

      <section className={cn(card, 'sm:flex-row sm:items-center sm:justify-between')}>
        <div className="flex flex-col gap-1">
          <h2 className={cardTitle}>{t('nav.logOut')}</h2>
          <p className="m-0 text-sm text-body-2">{t('settings.logoutText')}</p>
        </div>
        <button
          type="button"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          className="inline-flex h-12 items-center gap-2 self-start rounded-full border-[1.5px] border-danger bg-paper px-[22px] text-[15px] font-bold text-danger disabled:opacity-60"
        >
          <LogOut size={17} strokeWidth={2} aria-hidden="true" />
          {t('nav.logOut')}
        </button>
      </section>

      <EditProfileDialog user={user} open={editing} onOpenChange={setEditing} />
    </main>
  );
}

export function SettingsSkeleton() {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex max-w-[820px] flex-col gap-4 px-4 pb-16 pt-2 md:px-6 md:pt-9"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-10 w-48 rounded-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-36 rounded-[24px]" />
      ))}
    </div>
  );
}
