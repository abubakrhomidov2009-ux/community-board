'use client';

import {
  Bell,
  Heart,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import { Drawer } from 'vaul';
import { Avatar } from '@/components/shared/Avatar';
import { useLogoutMutation } from '@/features/auth/mutations';
import type { User } from '@/features/auth/api';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useTheme, type Theme } from '@/providers/theme';
import { cn } from '@/lib/utils';

const LOCALES: Locale[] = ['tg', 'ru', 'en'];
const THEMES: Theme[] = ['light', 'dark', 'system'];

/** The phone menu (the ☰ button): a drawer from the right with links, language, theme and Log out. */
export function MobileMenu({ user }: { user: User }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { theme, setTheme } = useTheme();
  const logout = useLogoutMutation();
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const links: {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number }>;
    note?: string;
  }[] = [
    { href: '/profile', label: t('nav.myProfile'), icon: UserIcon },
    { href: '/saved', label: t('nav.savedSlips'), icon: Heart },
    { href: '/messages', label: t('nav.messages'), icon: MessageCircle },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
    ...(isAdmin
      ? [
          {
            href: '/admin',
            label: t('nav.adminPanel'),
            icon: ShieldCheck,
            note: t('nav.adminOnly'),
          },
        ]
      : []),
  ];

  const group = 'grid grid-cols-3 gap-1 rounded-full bg-soft p-1';
  const option = (active: boolean) =>
    cn(
      'h-10 rounded-full text-sm transition-colors duration-150',
      active ? 'bg-ink font-bold text-on-ink' : 'font-semibold text-body',
    );

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger
        aria-label={t('nav.openMenu')}
        className="flex size-11 items-center justify-center rounded-full border border-border bg-paper text-ink"
      >
        <Menu size={20} strokeWidth={2} aria-hidden="true" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed bottom-2.5 right-2.5 top-2.5 z-50 flex w-[316px] max-w-[calc(100vw-20px)] flex-col gap-1.5 overflow-y-auto rounded-[26px] bg-paper p-3.5 outline-none"
        >
          <div className="flex items-center justify-between px-1 pb-2.5 pt-1">
            <Drawer.Title className="m-0 font-display text-base font-bold">
              {t('nav.menu')}
            </Drawer.Title>
            <Drawer.Close
              aria-label={t('nav.closeMenu')}
              className="flex size-11 items-center justify-center rounded-full bg-soft text-ink"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </Drawer.Close>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-[18px] bg-ink p-3.5 text-on-ink no-underline"
          >
            <Avatar username={user.username} avatarUrl={user.avatarUrl} size={46} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-bold">{user.username}</span>
              <span className="truncate text-[13px] opacity-70">
                {user.isStudentVerified ? '✓ ' : ''}
                {user.email}
              </span>
            </span>
          </Link>

          {links.map(({ href, label, icon: Icon, note }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex h-[50px] items-center gap-3.5 rounded-[14px] px-3 text-base font-semibold text-ink no-underline hover:bg-soft"
            >
              <Icon size={20} />
              {label}
              {note && <span className="ml-auto text-[11px] font-normal text-muted">{note}</span>}
            </Link>
          ))}

          <div className="mt-1.5 flex flex-col gap-2.5 border-t-[1.5px] border-dashed border-line px-3 pt-3.5">
            <div role="group" aria-label={t('nav.language')} className={group}>
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
                  className={option(code === locale)}
                >
                  {t(`nav.languageName.${code}`)}
                </button>
              ))}
            </div>
            <div role="group" aria-label={t('nav.themeLabel')} className={group}>
              {THEMES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={theme === item}
                  onClick={() => setTheme(item)}
                  className={option(theme === item)}
                >
                  {t(`theme.${item}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className="flex h-[50px] items-center gap-3.5 rounded-[14px] px-3 text-base font-bold text-danger hover:bg-danger-soft disabled:opacity-60"
          >
            <LogOut size={20} aria-hidden="true" />
            {t('nav.logOut')}
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
