'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PostSlip } from '@/components/shared/PostSlip';
import { pillClass } from '@/components/shared/pill-button';
import { Link, useRouter } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { CATEGORIES, DISTRICTS, deleteImage, uploadImages, type Post } from '../api';
import { KIND_OF, priceText, type Translate } from '../format';
import { useCreatePost, useUpdatePost } from '../mutations';
import { postKeys } from '../queries';
import {
  fromPost,
  hasPrice,
  postSchema,
  PRICE_UNITS,
  toBody,
  type PostFormInput,
  type PostFormValues,
} from '../schemas';
import { ImageUploader, type NewPhoto } from './ImageUploader';
import { MapPicker } from './Maps';

const STRIP = { lost: 'bg-lost', tutor: 'bg-tutor', rent: 'bg-rent', other: 'bg-other' } as const;

const EMPTY: PostFormInput = {
  category: 'RENTALS',
  title: '',
  description: '',
  district: 'UNIVERSITY_CAMPUS',
  price: '',
  priceUnit: 'PER_MONTH',
  contactTelegram: '',
  contactPhone: '',
};

const labelClass = 'text-xs font-bold uppercase tracking-[0.8px] text-body-2';
const inputClass =
  'box-border h-[52px] w-full min-w-0 rounded-2xl border-[1.5px] border-line bg-paper px-4 text-base text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger';

/** Create (no `post`) or edit (with `post`). Design: CreateDesktop/CreateMobile and EditDesktop/EditMobile. */
export function PostForm({ post }: { post?: Post }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useCreatePost();
  const update = useUpdatePost(post?.id ?? '');
  const [added, setAdded] = useState<NewPhoto[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [stage, setStage] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const [serverError, setServerError] = useState('');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    post?.latitude != null && post?.longitude != null
      ? { lat: post.latitude, lng: post.longitude }
      : null,
  );

  const form = useForm<PostFormInput, unknown, PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: post ? fromPost(post) : EMPTY,
    mode: 'onTouched',
  });
  const { register, handleSubmit, formState, setValue } = form;
  const watched = useWatch({ control: form.control });
  const category = watched.category ?? 'RENTALS';
  const priceAllowed = hasPrice(category);
  const existing = (post?.images ?? []).filter((image) => !removedIds.includes(image.id));
  const sending = stage !== 'idle';

  const message = (code?: string) => {
    if (!code) return null;
    return t.has(`errors.${code}` as never)
      ? t(`errors.${code}` as never)
      : t(`validation.${code}` as never);
  };

  async function onSubmit(values: PostFormValues) {
    setServerError('');
    setStage('saving');
    try {
      const body = { ...toBody(values), latitude: pin?.lat ?? null, longitude: pin?.lng ?? null };
      const saved = post ? await update.mutateAsync(body) : await create.mutateAsync(body);

      let photosFailed = false;
      if (removedIds.length > 0) {
        await Promise.all(removedIds.map((imageId) => deleteImage(saved.id, imageId)));
      }
      if (added.length > 0) {
        setStage('uploading');
        try {
          await uploadImages(
            saved.id,
            added.map((photo) => photo.file),
          );
        } catch {
          photosFailed = true;
        }
      }
      await queryClient.invalidateQueries({ queryKey: postKeys.detail(saved.id) });
      router.replace(photosFailed ? `/posts/${saved.id}/edit?photos=failed` : `/posts/${saved.id}`);
    } catch (error) {
      setServerError(message(toApiError(error).errorCode) ?? t('errors.UNKNOWN'));
      setStage('idle');
    }
  }

  const translate: Translate = (key, values) => t(key as never, values as never);
  const previewPost = {
    price: priceAllowed && watched.price ? Number(watched.price) || 0 : null,
    priceUnit: priceAllowed && watched.price ? (watched.priceUnit ?? 'PER_MONTH') : null,
  } as Post;
  const firstPhoto = existing[0]?.url ?? added[0]?.previewUrl;

  const heading = post ? t('form.editTitle') : t('form.createTitle');
  const submitLabel =
    stage === 'saving'
      ? t('form.saving')
      : stage === 'uploading'
        ? t('form.uploading')
        : post
          ? t('form.submitSave')
          : t('form.submitCreate');

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pb-36 pt-2 md:gap-6 md:px-6 md:pb-16 md:pt-8"
    >
      <div className="flex flex-col gap-1.5">
        <Link
          href={post ? `/posts/${post.id}` : '/posts'}
          className="text-sm font-semibold no-underline"
        >
          {post ? t('form.backSlip') : t('form.backBoard')}
        </Link>
        <h1 className="m-0 font-display text-[28px] font-bold tracking-[-1px] md:text-[40px] md:tracking-[-1.2px]">
          {heading}
        </h1>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-w-0 flex-col gap-6 rounded-[28px] border border-border bg-paper p-5 md:p-[30px] lg:flex-[999_1_560px]"
        >
          <fieldset className="m-0 border-0 p-0">
            <legend className={cn(labelClass, 'mb-3')}>{t('form.step1')}</legend>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {CATEGORIES.map((item) => (
                <label
                  key={item}
                  className="flex h-[88px] cursor-pointer flex-col justify-between rounded-2xl border-[1.5px] border-line p-[12px_14px] text-sm font-semibold transition-colors duration-150 has-[:checked]:border-2 has-[:checked]:border-ink has-[:checked]:bg-soft has-[:checked]:font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                >
                  <span className={cn('h-1.5 w-full rounded-[3px]', STRIP[KIND_OF[item]])} />
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={item}
                      {...register('category', {
                        onChange: () => {
                          if (!hasPrice(item)) setValue('price', '');
                        },
                      })}
                      className="size-4 accent-primary"
                    />
                    {t(`category.${item}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            id="post-title"
            label={t('form.step2')}
            error={message(formState.errors.title?.message)}
          >
            <input
              id="post-title"
              maxLength={120}
              placeholder={t('form.titlePlaceholder')}
              aria-invalid={formState.errors.title ? true : undefined}
              {...register('title')}
              className={cn(inputClass, 'h-[54px] border-ink text-[17px]')}
            />
          </Field>

          <Field
            id="post-details"
            label={t('form.step3')}
            error={message(formState.errors.description?.message)}
          >
            <textarea
              id="post-details"
              rows={4}
              maxLength={5000}
              placeholder={t('form.detailsPlaceholder')}
              aria-invalid={formState.errors.description ? true : undefined}
              {...register('description')}
              className={cn(inputClass, 'h-auto resize-y py-3.5')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {priceAllowed ? (
              <>
                <Field
                  id="post-price"
                  label={t('form.price')}
                  error={message(formState.errors.price?.message)}
                >
                  <input
                    id="post-price"
                    inputMode="numeric"
                    placeholder="800"
                    aria-invalid={formState.errors.price ? true : undefined}
                    {...register('price')}
                    className={inputClass}
                  />
                </Field>
                <Field id="post-unit" label={t('form.per')}>
                  <select id="post-unit" {...register('priceUnit')} className={inputClass}>
                    {PRICE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {t(`form.unit.${unit}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <p className="col-span-2 m-0 self-center text-sm text-body-2 md:col-span-2">
                {t('form.priceNotAllowed')}
              </p>
            )}
            <Field id="post-where" label={t('form.where')}>
              <select
                id="post-where"
                {...register('district')}
                className={cn(inputClass, !priceAllowed && 'col-span-1')}
              >
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {t(`district.${district}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className={labelClass}>
              {t('form.step4')}{' '}
              <span className="font-medium normal-case tracking-normal">
                {t('form.photosHint')}
              </span>
            </span>
            <ImageUploader
              existing={existing}
              added={added}
              onRemoveExisting={(id) => setRemovedIds((ids) => [...ids, id])}
              onAdd={(photos) => setAdded((current) => [...current, ...photos])}
              onRemoveAdded={(key) => setAdded((current) => current.filter((p) => p.key !== key))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              id="post-telegram"
              label={t('form.step5')}
              error={message(formState.errors.contactTelegram?.message)}
            >
              <input
                id="post-telegram"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={t('form.telegramPlaceholder')}
                aria-invalid={formState.errors.contactTelegram ? true : undefined}
                {...register('contactTelegram')}
                className={inputClass}
              />
            </Field>
            <Field
              id="post-phone"
              label={`${t('form.phone')} (${t('form.optional')})`}
              error={message(formState.errors.contactPhone?.message)}
            >
              <input
                id="post-phone"
                type="tel"
                placeholder={t('form.phonePlaceholder')}
                aria-invalid={formState.errors.contactPhone ? true : undefined}
                {...register('contactPhone')}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className={labelClass}>{t('form.step6')}</span>
            <MapPicker value={pin} onChange={setPin} />
          </div>

          {serverError && (
            <p role="alert" className="m-0 text-sm font-semibold text-danger">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-line pt-[18px]">
            <Link
              href={post ? `/posts/${post.id}` : '/posts'}
              className={pillClass('outline', 'lg', 'h-[52px] text-[15px]')}
            >
              {t('form.cancel')}
            </Link>
            <button
              type="submit"
              disabled={sending}
              className={pillClass('green', 'lg', 'h-[52px] gap-2.5 px-[26px] text-[15px]')}
            >
              {submitLabel}
              {!sending && <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          </div>
        </form>

        <aside className="hidden max-w-[360px] flex-[1_1_300px] flex-col gap-3.5 lg:flex">
          <p className={cn(labelClass, 'm-0')}>{t('form.preview')}</p>
          <div className="px-1.5 py-3.5">
            <PostSlip
              item={{
                kind: KIND_OF[category],
                categoryLabel: t(`category.${category}`),
                time: t('form.justNow'),
                title: watched.title?.trim() || t('form.previewTitle'),
                price:
                  priceAllowed && watched.price ? priceText(previewPost, translate, locale) : '',
                district: t(`district.${watched.district ?? 'UNIVERSITY_CAMPUS'}`),
                photo: true,
                photoUrl: firstPhoto,
                tilt: 1,
              }}
            />
          </div>
          <p className="m-0 text-sm leading-relaxed text-body">{t('form.previewTip')}</p>
        </aside>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="m-0 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
