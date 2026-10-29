'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useSession } from '@/features/auth/queries';
import { Link } from '@/i18n/navigation';
import { Skeleton } from './Skeleton';

const cell = 'flex h-[62px] items-center justify-center text-[15px] font-bold no-underline';

/** The two buttons under the 404 slip. People who are logged in go to the board; guests to About or Log in. */
export function NotFoundActions() {
  const t = useTranslations('notFound');
  const { openAuth } = useAuth();
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <div className="grid grid-cols-2 border-t-[1.5px] border-dashed border-line">
        <Skeleton className="h-[62px] rounded-none rounded-bl-[23px]" />
        <Skeleton className="h-[62px] rounded-none" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 border-t-[1.5px] border-dashed border-line">
      {session.status === 'user' ? (
        <>
          <Link href="/posts" className={`${cell} rounded-bl-[23px] bg-ink text-on-ink`}>
            {t('home')}
          </Link>
          <Link href="/posts" className={`${cell} text-ink hover:bg-soft rounded-br-[23px]`}>
            {t('search')}
          </Link>
        </>
      ) : (
        <>
          <Link href="/" className={`${cell} rounded-bl-[23px] bg-ink text-on-ink`}>
            {t('about')}
          </Link>
          <button
            type="button"
            onClick={() => openAuth('login')}
            className={`${cell} rounded-br-[23px] border-0 bg-transparent text-ink hover:bg-soft`}
          >
            {t('login')}
          </button>
        </>
      )}
    </div>
  );
}
