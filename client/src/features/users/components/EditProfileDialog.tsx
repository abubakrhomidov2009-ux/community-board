'use client';

import { Dialog } from '@base-ui/react/dialog';
import imageCompression from 'browser-image-compression';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { pillClass } from '@/components/shared/pill-button';
import { registerSchema } from '@/features/auth/schemas';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import type { User } from '../api';
import { useChangePassword, useRemoveAvatar, useUpdateMe, useUploadAvatar } from '../mutations';

const inputClass =
  'box-border h-[50px] w-full min-w-0 rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-base text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger';
const labelClass = 'text-xs font-bold uppercase tracking-[0.8px] text-body-2';

/** Edit profile: picture, username and password in one small slip. */
export function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.username);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const update = useUpdateMe();
  const password = useChangePassword();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();

  const text = (code: string) =>
    t.has(`errors.${code}` as never)
      ? t(`errors.${code}` as never)
      : t.has(`validation.${code}` as never)
        ? t(`validation.${code}` as never)
        : t('errors.UNKNOWN');

  function saveName(event: FormEvent) {
    event.preventDefault();
    setNameSaved(false);
    const parsed = registerSchema.shape.username.safeParse(name);
    if (!parsed.success) return setNameError(text(parsed.error.issues[0]?.message ?? 'required'));
    setNameError('');
    update.mutate(
      { username: parsed.data },
      {
        onSuccess: (saved) => {
          setName(saved.username);
          setNameSaved(true);
        },
        onError: (error) => setNameError(text(toApiError(error).errorCode)),
      },
    );
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordSaved(false);
    if (current === '') return setPasswordError(text('required'));
    const parsed = registerSchema.shape.password.safeParse(next);
    if (!parsed.success)
      return setPasswordError(text(parsed.error.issues[0]?.message ?? 'required'));
    setPasswordError('');
    password.mutate(
      { currentPassword: current, newPassword: parsed.data },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setPasswordSaved(true);
        },
        onError: (error) => setPasswordError(text(toApiError(error).errorCode)),
      },
    );
  }

  async function pickPicture(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPictureError('');
    try {
      const small = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1000,
        useWebWorker: true,
      });
      upload.mutate(new File([small], file.name, { type: small.type || file.type }), {
        onError: (error) => setPictureError(text(toApiError(error).errorCode)),
      });
    } catch {
      setPictureError(text('UPLOAD_FAILED'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const done = (message: string) => (
    <p role="status" className="m-0 text-sm font-semibold text-primary">
      {message}
    </p>
  );
  const problem = (message: string) =>
    message && (
      <p role="alert" className="m-0 text-sm font-semibold text-danger">
        {message}
      </p>
    );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 md:items-center md:p-6">
          <Dialog.Popup className="relative my-auto w-[520px] max-w-full rounded-[8px_8px_24px_24px] border border-border bg-paper outline-none transition-[opacity,transform] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <span
              aria-hidden="true"
              className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full"
            />
            <div className="h-[7px] rounded-[7px_7px_0_0] bg-ink" />
            <div className="flex flex-col gap-6 p-5 md:p-7">
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="m-0 font-display text-[22px] font-bold tracking-[-0.5px]">
                  {t('profile.editTitle')}
                </Dialog.Title>
                <Dialog.Close
                  aria-label={t('common.close')}
                  className="-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full bg-soft text-ink"
                >
                  <X size={20} strokeWidth={2} aria-hidden="true" />
                </Dialog.Close>
              </div>

              <section className="flex flex-col gap-3" aria-label={t('profile.picture')}>
                <span className={labelClass}>{t('profile.picture')}</span>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar username={user.username} avatarUrl={user.avatarUrl} size={72} />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={upload.isPending}
                      onClick={() => fileInput.current?.click()}
                      className={pillClass('outline', 'md', 'text-sm')}
                    >
                      {upload.isPending ? t('post.working') : t('profile.upload')}
                    </button>
                    {user.avatarUrl && (
                      <button
                        type="button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate()}
                        className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-danger"
                      >
                        {t('profile.removePicture')}
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => void pickPicture(event.target.files)}
                />
                <p className="m-0 text-[13px] text-muted">{t('profile.pictureHint')}</p>
                {problem(pictureError)}
              </section>

              <form onSubmit={saveName} className="flex flex-col gap-2.5" noValidate>
                <label htmlFor="edit-username" className={labelClass}>
                  {t('profile.username')}
                </label>
                <input
                  id="edit-username"
                  value={name}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  aria-invalid={nameError ? true : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameSaved(false);
                  }}
                  className={inputClass}
                />
                {problem(nameError)}
                {nameSaved && done(t('profile.saved'))}
                <button
                  type="submit"
                  disabled={update.isPending || name.trim() === user.username}
                  className={cn(pillClass('ink', 'md', 'self-start text-sm'))}
                >
                  {t('profile.saveName')}
                </button>
              </form>

              <form
                onSubmit={savePassword}
                className="flex flex-col gap-2.5 border-t-[1.5px] border-dashed border-line pt-5"
                noValidate
              >
                <span className={labelClass}>{t('profile.passwordTitle')}</span>
                <label htmlFor="edit-current" className="sr-only">
                  {t('profile.currentPassword')}
                </label>
                <input
                  id="edit-current"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('profile.currentPassword')}
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  className={inputClass}
                />
                <label htmlFor="edit-new" className="sr-only">
                  {t('profile.newPassword')}
                </label>
                <input
                  id="edit-new"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('profile.newPassword')}
                  value={next}
                  maxLength={72}
                  onChange={(event) => setNext(event.target.value)}
                  className={inputClass}
                />
                {problem(passwordError)}
                {passwordSaved && done(t('profile.passwordChanged'))}
                <button
                  type="submit"
                  disabled={password.isPending}
                  className={pillClass('ink', 'md', 'self-start text-sm')}
                >
                  {t('profile.changePassword')}
                </button>
              </form>

              <Dialog.Close className={pillClass('outline', 'md', 'self-end')}>
                {t('profile.done')}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
