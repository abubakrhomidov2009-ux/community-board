'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { pillClass } from '@/components/shared/pill-button';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { REASONS, reportPost, type ReportBody } from '../api';

/** "Report" button and the small slip it opens: pick a reason, add a note, send. */
export function ReportButton({ postId }: { postId: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportBody['reason']>('SPAM');
  const [details, setDetails] = useState('');
  const send = useMutation({ mutationFn: (body: ReportBody) => reportPost(postId, body) });

  const code = send.isError ? toApiError(send.error).errorCode : '';
  const error = code
    ? t.has(`errors.${code}` as never)
      ? t(`errors.${code}` as never)
      : t('errors.UNKNOWN')
    : '';

  function submit(event: FormEvent) {
    event.preventDefault();
    send.mutate({ reason, details: details.trim() || undefined });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          send.reset();
          setDetails('');
        }
      }}
    >
      <Dialog.Trigger className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-line bg-paper px-5 text-sm font-bold text-body">
        <Flag size={16} strokeWidth={2} aria-hidden="true" />
        {t('report.button')}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup className="relative w-[460px] max-w-full rounded-[8px_8px_24px_24px] border border-border bg-paper p-6 outline-none transition-[opacity,transform] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <span
              aria-hidden="true"
              className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full"
            />
            <Dialog.Title className="m-0 font-display text-xl font-bold tracking-[-0.5px]">
              {t('report.title')}
            </Dialog.Title>

            {send.isSuccess ? (
              <>
                <Dialog.Description className="mb-0 mt-3 text-base text-body">
                  {t('report.sent')}
                </Dialog.Description>
                <div className="mt-6 flex justify-end">
                  <Dialog.Close className={pillClass('ink', 'md')}>
                    {t('report.close')}
                  </Dialog.Close>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 text-xs font-bold uppercase tracking-[0.8px] text-body-2">
                    {t('report.reasonLabel')}
                  </legend>
                  {REASONS.map((item) => (
                    <label
                      key={item}
                      className={cn(
                        'flex h-12 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 text-[15px] font-semibold',
                        reason === item ? 'border-ink bg-soft' : 'border-line',
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={item}
                        checked={reason === item}
                        onChange={() => setReason(item)}
                        className="size-4 accent-primary"
                      />
                      {t(`report.reasons.${item}`)}
                    </label>
                  ))}
                </fieldset>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="report-details"
                    className="text-xs font-bold uppercase tracking-[0.8px] text-body-2"
                  >
                    {t('report.details')}
                  </label>
                  <textarea
                    id="report-details"
                    rows={3}
                    maxLength={500}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    className="resize-none rounded-2xl border-[1.5px] border-line bg-paper px-4 py-3 text-base text-ink focus:border-ink focus:outline-none"
                  />
                </div>
                {error && (
                  <p role="alert" className="m-0 text-sm font-semibold text-danger">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2.5">
                  <Dialog.Close className={pillClass('outline', 'md')}>
                    {t('post.cancel')}
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={send.isPending}
                    className={pillClass('ink', 'md')}
                  >
                    {send.isPending ? t('post.working') : t('report.send')}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
