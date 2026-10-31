'use client';

import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { pillClass } from '@/components/shared/pill-button';
import { useSession } from '@/features/auth/queries';
import { timeAgo } from '@/features/posts/format';
import { toApiError } from '@/lib/api/errors';
import { slideUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useAddComment, useDeleteComment } from '../mutations';
import { useComments } from '../queries';

const initials = (username: string) => username.slice(0, 2).toUpperCase();

/** "Notes on this slip": the list, a box to add a note, delete for your own notes (and admins). */
export function CommentsSection({
  postId,
  authorUsername,
  canWrite,
}: {
  postId: string;
  authorUsername: string;
  /** Notes can only be added while the post is active. */
  canWrite: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const session = useSession();
  const comments = useComments(postId);
  const add = useAddComment(postId);
  const remove = useDeleteComment(postId);
  const [text, setText] = useState('');
  const [tooLong, setTooLong] = useState(false);

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const total = comments.data?.pages[0]?.total ?? 0;
  const me = session.user;
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  const errorCode = add.isError
    ? toApiError(add.error).errorCode
    : remove.isError
      ? toApiError(remove.error).errorCode
      : '';
  const errorText = errorCode
    ? t.has(`errors.${errorCode}` as never)
      ? t(`errors.${errorCode}` as never)
      : t('errors.UNKNOWN')
    : '';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (body.length < 1 || body.length > 1000) {
      setTooLong(true);
      return;
    }
    setTooLong(false);
    add.mutate(body, { onSuccess: () => setText('') });
  }

  return (
    <section
      aria-label={t('comments.title')}
      className="flex flex-col gap-4 rounded-[24px] border border-border bg-paper p-5 md:p-[26px]"
    >
      <h2 className="m-0 font-display text-lg font-bold">
        {t('comments.title')} <span className="text-muted">{total}</span>
      </h2>

      {comments.isSuccess && items.length === 0 && (
        <p className="m-0 text-[15px] text-body-2">{t('comments.empty')}</p>
      )}

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        <AnimatePresence initial={false}>
          {items.map((comment) => {
            const byAuthor = comment.author.username === authorUsername;
            const canDelete = me && (me.username === comment.author.username || isAdmin);
            return (
              <motion.li
                key={comment.id}
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, height: 0 }}
                layout="position"
                className="flex gap-3"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    byAuthor ? 'bg-note text-note-ink' : 'bg-primary-soft text-primary-soft-ink',
                  )}
                >
                  {initials(comment.author.username)}
                </span>
                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-[4px_18px_18px_18px] px-4 py-3',
                    byAuthor ? 'border border-note-border bg-note' : 'bg-soft',
                  )}
                >
                  <p className="m-0 mb-1 flex flex-wrap items-center gap-x-1.5 text-[13px] font-bold">
                    {comment.author.username}
                    {byAuthor && (
                      <span className="rounded-[5px] border-[1.5px] border-note-ink px-1.5 text-[11px] text-note-ink">
                        {t('comments.author')}
                      </span>
                    )}
                    <span className="font-medium text-muted">
                      · {timeAgo(comment.createdAt, locale)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label={t('comments.delete')}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(comment.id)}
                        className="-my-2 ml-auto flex size-11 items-center justify-center rounded-full text-muted hover:text-danger"
                      >
                        <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </p>
                  <p className="m-0 whitespace-pre-line text-[15px] leading-[1.55] [overflow-wrap:anywhere]">
                    {comment.body}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {comments.hasNextPage && (
        <button
          type="button"
          disabled={comments.isFetchingNextPage}
          onClick={() => comments.fetchNextPage()}
          className={pillClass('outline', 'md', 'self-center')}
        >
          {t('comments.showMore')}
        </button>
      )}

      {canWrite ? (
        <form onSubmit={submit} className="flex flex-col gap-2 pt-1.5">
          <div className="flex items-end gap-2.5">
            <label htmlFor="comment-body" className="sr-only">
              {t('comments.label')}
            </label>
            <textarea
              id="comment-body"
              rows={2}
              value={text}
              maxLength={1000}
              onChange={(event) => setText(event.target.value)}
              placeholder={t('comments.placeholder')}
              className="min-h-[52px] min-w-0 flex-1 resize-none rounded-[20px] border-[1.5px] border-line bg-paper px-[18px] py-3.5 text-base text-ink placeholder:text-muted focus:border-ink"
            />
            <button
              type="submit"
              disabled={add.isPending || text.trim() === ''}
              className={pillClass('ink', 'md', 'h-[50px] px-[22px] text-[15px]')}
            >
              {t('comments.post')}
            </button>
          </div>
          {tooLong && (
            <p role="alert" className="m-0 text-sm font-semibold text-danger">
              {t('validation.commentLength')}
            </p>
          )}
        </form>
      ) : (
        <p className="m-0 text-sm text-body-2">{t('comments.closed')}</p>
      )}

      {errorText && (
        <p role="alert" className="m-0 text-sm font-semibold text-danger">
          {errorText}
        </p>
      )}
    </section>
  );
}
