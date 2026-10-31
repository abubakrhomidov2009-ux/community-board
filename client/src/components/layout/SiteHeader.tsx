'use client';

import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import { pillClass } from '@/components/shared/pill-button';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useSession } from '@/features/auth/queries';
import { Link, usePathname } from '@/i18n/navigation';
import { t as motionTime } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

/**
 * The floating pill navbar on a laptop and the top bar on a phone.
 * Guests see the About links and Log in; logged-in people see the board links.
 */
export function SiteHeader() {
  return (
    <>
      <Navbar />
      <MobileTopBar />
    </>
  );
}

function Navbar() {
  const t = useTranslations('nav');
  const { openAuth } = useAuth();
  const session = useSession();
  const pathname = usePathname();

  const guestLinks = [
    { href: '/#how', label: t('howItWorks') },
    { href: '/#kinds', label: t('categories') },
    { href: '/#rules', label: t('rules') },
  ];
  const memberLinks = [
    {
      href: '/posts',
      label: t('board'),
      active: pathname === '/posts' || /^\/posts\/(?!new)/.test(pathname),
    },
    { href: '/saved', label: t('saved'), active: pathname === '/saved' },
    { href: '/messages', label: t('messages'), active: pathname.startsWith('/messages') },
  ];

  return (
    <div className="sticky top-0 z-30 hidden px-6 pt-4 lg:block">
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTime.slow}
        className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 rounded-full border border-border bg-paper py-2 pl-[18px] pr-2"
      >
        <Logo />

        {session.status === 'loading' && (
          <>
            <div className="flex flex-1 justify-center gap-2" aria-hidden="true">
              <Skeleton className="h-11 w-24 rounded-full" />
              <Skeleton className="h-11 w-24 rounded-full" />
              <Skeleton className="h-11 w-24 rounded-full" />
            </div>
            <Skeleton className="h-11 w-56 rounded-full" />
          </>
        )}

        {session.status === 'guest' && (
          <>
            <nav aria-label={t('about')} className="flex flex-1 justify-center gap-1">
              {guestLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex h-11 items-center px-4 text-sm font-semibold text-body no-underline transition-colors duration-150 hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => openAuth('login')}
                className={pillClass('ink', 'md')}
              >
                {t('logIn')}
              </button>
            </div>
          </>
        )}

        {session.status === 'user' && (
          <>
            <nav aria-label={t('main')} className="flex flex-1 justify-center gap-1">
              {memberLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? 'page' : undefined}
                  className={cn(
                    'flex h-11 items-center rounded-full px-[18px] text-sm font-semibold no-underline transition-colors duration-150',
                    link.active ? 'bg-ink text-on-ink' : 'text-body hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageSwitcher />
              <NotificationBell />
              <Link href="/posts/new" className={pillClass('green', 'md', 'ml-1 gap-2')}>
                <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                {t('pinPost')}
              </Link>
              <Link
                href="/profile"
                aria-label={t('myProfile')}
                className="flex rounded-full no-underline"
              >
                <Avatar
                  username={session.user.username}
                  avatarUrl={session.user.avatarUrl}
                  size={44}
                />
              </Link>
            </div>
          </>
        )}
      </motion.header>
    </div>
  );
}

function MobileTopBar() {
  const t = useTranslations('nav');
  const { openAuth } = useAuth();
  const session = useSession();

  return (
    <header className="flex h-16 items-center justify-between gap-2 pl-3.5 pr-2.5 lg:hidden">
      <Logo size="sm" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {session.status === 'loading' && <Skeleton className="size-11 rounded-full" />}
        {session.status === 'guest' && (
          <button
            type="button"
            onClick={() => openAuth('login')}
            className={pillClass('ink', 'md', 'px-[18px]')}
          >
            {t('logIn')}
          </button>
        )}
        {session.status === 'user' && (
          <>
            <NotificationBell />
            <MobileMenu user={session.user} />
          </>
        )}
      </div>
    </header>
  );
}
