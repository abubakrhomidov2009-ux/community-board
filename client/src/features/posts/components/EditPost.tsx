'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
import { useSession } from '@/features/auth/queries';
import { useRouter } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { usePost } from '../queries';
import { PostForm } from './PostForm';

/** The edit page: loads the post, lets only the author in. */
export function EditPost({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const session = useSession();
  const post = usePost(id);
  const photosFailed = useSearchParams().get('photos') === 'failed';
  const notAuthor =
    post.isSuccess &&
    session.status !== 'loading' &&
    session.user?.username !== post.data.author.username;

  // Only the author edits a slip: everybody else goes back to the slip.
  useEffect(() => {
    if (notAuthor) router.replace(`/posts/${id}`);
  }, [notAuthor, router, id]);

  if (post.isPending || session.status === 'loading') return <FormSkeleton />;
  if (post.isError) {
    if (toApiError(post.error).statusCode === 404) notFound();
    return (
      <p role="alert" className="mx-auto max-w-[720px] px-5 py-16 text-center text-base text-body">
        {t('errors.UNKNOWN')}
      </p>
    );
  }
  if (notAuthor) return <FormSkeleton />;

  return (
    <>
      {photosFailed && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-[1200px] rounded-2xl border border-note-border bg-note px-4 py-3 text-sm font-semibold text-note-ink md:mt-6"
        >
          {t('form.photosFailed')}
        </p>
      )}
      <PostForm post={post.data} />
    </>
  );
}

/** The form placeholder: same shape as the form. */
export function FormSkeleton() {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pb-16 pt-4 md:gap-6 md:px-6 md:pt-8"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-9 w-56 rounded-full md:h-11 md:w-72" />
      <div className="flex flex-col gap-5 rounded-[28px] border border-border bg-paper p-5 md:p-[30px]">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[54px] rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-[52px] rounded-2xl" />
      </div>
    </div>
  );
}
