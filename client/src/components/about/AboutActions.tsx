'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { pillClass } from '@/components/shared/pill-button';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useSession } from '@/features/auth/queries';
import { Link } from '@/i18n/navigation';

/** Under the headline: Log in and Create account (or a link to the board for someone who is logged in). */
export function HeroActions() {
  const t = useTranslations('nav');
  const { openAuth } = useAuth();
  const session = useSession();

  if (session.status === 'user') {
    return (
      <div className="flex flex-col gap-3 md:flex-row">
        <Link href="/posts" className={pillClass('ink', 'lg', 'max-md:h-[54px] max-md:w-full')}>
          {t('board')}
          <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
      <button
        type="button"
        onClick={() => openAuth('login')}
        className={pillClass('ink', 'lg', 'max-md:h-[54px] max-md:w-full')}
      >
        {t('logIn')}
      </button>
      <button
        type="button"
        onClick={() => openAuth('register')}
        className={pillClass('outline', 'lg', 'max-md:h-[54px] max-md:w-full')}
      >
        {t('createAccount')}
      </button>
    </div>
  );
}

/** The big white button in the green block at the bottom. */
export function CtaButton({ size = 'xl' }: { size?: 'xl' | 'block' }) {
  const t = useTranslations('nav');
  const { openAuth } = useAuth();
  const session = useSession();

  if (session.status === 'user') {
    return (
      <Link href="/posts" className={pillClass('white', size)}>
        {t('board')}
        <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => openAuth('register')} className={pillClass('white', size)}>
      {t('createAccount')}
      <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
