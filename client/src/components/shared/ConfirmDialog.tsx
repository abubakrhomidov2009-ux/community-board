'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { pillClass } from './pill-button';

/**
 * "Are you sure?" as a small slip in the middle of the screen. Esc and the Cancel button close it;
 * the focus stays inside while it is open.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  text,
  confirmLabel,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  const t = useTranslations('post');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="relative w-[420px] max-w-full rounded-[8px_8px_24px_24px] border border-border bg-paper p-6 outline-none transition-[opacity,transform] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <span
              aria-hidden="true"
              className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full"
            />
            <Dialog.Title className="m-0 font-display text-xl font-bold tracking-[-0.5px]">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mb-0 mt-3 text-base leading-relaxed text-body">
              {text}
            </Dialog.Description>
            {error && (
              <p role="alert" className="mb-0 mt-3 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <Dialog.Close className={pillClass('outline', 'md')}>{t('cancel')}</Dialog.Close>
              <button
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className="inline-flex h-11 items-center justify-center rounded-full bg-danger px-[22px] text-sm font-bold text-white transition-opacity duration-150 active:scale-[0.97] disabled:opacity-60"
              >
                {pending ? t('working') : confirmLabel}
              </button>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
