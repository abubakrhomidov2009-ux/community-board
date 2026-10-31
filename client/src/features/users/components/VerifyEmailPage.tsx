'use client';

import { BadgeCheck, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
import { StateSlip } from '@/components/shared/StateSlip';
import { pillClass } from '@/components/shared/pill-button';
import { Link } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { useVerifyUniversityEmail } from '../mutations';

/** The page the link in the university email opens: it confirms the token once and shows the result. */
export function VerifyEmailPage() {
  const t = useTranslations();
  const token = useSearchParams().get('token') ?? '';
  const verify = useVerifyUniversityEmail();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token);
  }, [token, verify]);

  const code = verify.isError
    ? toApiError(verify.error).errorCode
    : !token
      ? 'VALIDATION_FAILED'
      : '';
  const errorText = code
    ? t.has(`errors.${code}` as never)
      ? t(`errors.${code}` as never)
      : t('errors.UNKNOWN')
    : '';

  return (
    <main id="main" className="mx-auto max-w-[720px] px-4 py-12 md:py-20">
      {verify.isSuccess ? (
        <StateSlip
          icon={
            <BadgeCheck size={38} strokeWidth={1.6} className="text-primary" aria-hidden="true" />
          }
          title={t('settings.verifiedTitle')}
          text={t('settings.verifiedText')}
          action={
            <Link href="/settings" className={pillClass('ink', 'md')}>
              {t('settings.backToSettings')}
            </Link>
          }
        />
      ) : errorText ? (
        <StateSlip
          icon={<TriangleAlert size={34} strokeWidth={1.6} aria-hidden="true" />}
          title={t('settings.verifyFailed')}
          text={errorText}
          action={
            <Link href="/settings" className={pillClass('outline', 'md')}>
              {t('settings.backToSettings')}
            </Link>
          }
        />
      ) : (
        <div role="status" aria-busy="true" className="flex flex-col items-center gap-3">
          <span className="sr-only">{t('common.loading')}</span>
          <Skeleton className="h-48 w-full max-w-[460px] rounded-[24px]" />
        </div>
      )}
    </main>
  );
}
