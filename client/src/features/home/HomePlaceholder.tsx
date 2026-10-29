'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { pillClass } from '@/components/shared/pill-button';
import { useLogoutMutation } from '@/features/auth/mutations';
import { useSession } from '@/features/auth/queries';

/**
 * TEMPORARY page for /posts until the real board is built in the next step.
 * It only proves the login works: it shows who is logged in and has a Log out button.
 */
export function HomePlaceholder() {
  const t = useTranslations('home');
  const session = useSession();
  const logout = useLogoutMutation();

  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 py-12 md:py-20">
      <div className="relative rounded-[8px_8px_24px_24px] border border-border bg-paper p-8">
        <span
          aria-hidden="true"
          className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full border-4"
        />
        <h1 className="m-0 font-display text-[32px] font-bold tracking-[-1px]">{t('title')}</h1>
        <p className="mb-1 mt-3 text-base text-body">{t('soon')}</p>
        {session.user && (
          <p className="m-0 text-base font-semibold text-ink">
            {t('signedInAs', { name: session.user.username })}
          </p>
        )}
        <button
          type="button"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          className={pillClass('outline', 'md', 'mt-6')}
        >
          <LogOut size={17} strokeWidth={2} aria-hidden="true" />
          {t('logout')}
        </button>
      </div>
    </main>
  );
}
