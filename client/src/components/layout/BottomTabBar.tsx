'use client';

import { Heart, LayoutGrid, Plus, Search, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { t as motionTime } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** The floating dark tab bar on a phone: Board, Search, Pin a post (+), Saved, Me. */
export function BottomTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const active = pathname.startsWith('/saved')
    ? 'saved'
    : pathname.startsWith('/profile')
      ? 'me'
      : pathname === '/posts'
        ? 'board'
        : null;

  const tab = (
    key: string,
    href: string,
    label: string,
    Icon: typeof Search,
    onClick?: () => void,
  ) => (
    <Link
      key={key}
      href={href}
      onClick={onClick}
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        'relative flex h-[54px] flex-col items-center justify-center gap-[3px] text-[11px] font-semibold no-underline transition-colors duration-150',
        active === key ? 'text-white' : 'text-[#a7b8b3]',
      )}
    >
      {active === key && (
        <motion.span
          layoutId="tab-indicator"
          transition={motionTime.base}
          aria-hidden="true"
          className="absolute top-0.5 h-1 w-6 rounded-full bg-pin"
        />
      )}
      <Icon size={21} strokeWidth={2} aria-hidden="true" />
      {label}
    </Link>
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3.5 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
      <nav
        aria-label={t('main')}
        className="pointer-events-auto grid h-[66px] grid-cols-5 items-center rounded-full bg-[#0e1a17] px-2 shadow-[0_8px_24px_rgba(14,26,23,0.25)]"
      >
        {tab('board', '/posts', t('board'), LayoutGrid)}
        {tab('search', '/posts', t('search'), Search, () => {
          // Already on the board: jump straight into the search box.
          const box = document.getElementById('board-search');
          if (box) {
            box.focus();
            box.scrollIntoView({ block: 'center' });
          }
        })}
        <Link
          href="/posts/new"
          aria-label={t('pinPost')}
          className="flex size-[52px] items-center justify-center justify-self-center rounded-full bg-[#0f766e] text-white shadow-[0_0_0_4px_#0e1a17,0_0_0_6px_#2dd4bf] transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100"
        >
          <Plus size={24} strokeWidth={2.4} aria-hidden="true" />
        </Link>
        {tab('saved', '/saved', t('saved'), Heart)}
        {tab('me', '/profile', t('me'), User)}
      </nav>
    </div>
  );
}
