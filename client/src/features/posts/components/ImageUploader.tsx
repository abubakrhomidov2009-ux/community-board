'use client';

import imageCompression from 'browser-image-compression';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MAX_IMAGES } from '../images';

export interface NewPhoto {
  /** A random id so React can keep the list stable. */
  key: string;
  file: File;
  previewUrl: string;
}

export interface ExistingPhoto {
  id: string;
  url: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Up to 5 photos. A new photo is made smaller in the browser first (max 1600 px, about 0.8 MB), so a phone camera
 * picture uploads fast. On a phone the file button offers the camera and the gallery.
 */
export function ImageUploader({
  existing,
  added,
  onRemoveExisting,
  onAdd,
  onRemoveAdded,
}: {
  existing: ExistingPhoto[];
  added: NewPhoto[];
  onRemoveExisting: (id: string) => void;
  onAdd: (photos: NewPhoto[]) => void;
  onRemoveAdded: (key: string) => void;
}) {
  const t = useTranslations('form');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const total = existing.length + added.length;

  // Give the memory of the preview pictures back when the form closes.
  const addedRef = useRef(added);
  useEffect(() => {
    addedRef.current = added;
  });
  useEffect(
    () => () => addedRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)),
    [],
  );

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - total;
    const chosen = Array.from(files).slice(0, Math.max(room, 0));
    setProblem(files.length > room ? 'IMAGE_LIMIT_EXCEEDED' : null);
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const prepared: NewPhoto[] = [];
      for (const file of chosen) {
        if (!ACCEPT.split(',').includes(file.type)) {
          setProblem('IMAGE_TYPE_INVALID');
          continue;
        }
        const small = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        const named = new File([small], file.name, { type: small.type || file.type });
        prepared.push({
          key: crypto.randomUUID(),
          file: named,
          previewUrl: URL.createObjectURL(named),
        });
      }
      if (prepared.length) onAdd(prepared);
    } catch {
      setProblem('UPLOAD_FAILED');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const tile = 'relative size-[104px] shrink-0 overflow-hidden rounded-[18px] sm:size-[112px]';
  const remove =
    'absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-ink text-on-ink';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2.5">
        {total < MAX_IMAGES && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex size-[104px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-ink bg-soft text-[13px] font-bold text-ink disabled:opacity-60 sm:size-[112px]"
          >
            <Plus size={24} strokeWidth={2} aria-hidden="true" />
            {busy ? t('preparing') : t('addPhoto')}
          </button>
        )}
        {existing.map((photo, i) => (
          <div key={photo.id} className={tile}>
            <Image src={photo.url} alt="" fill unoptimized sizes="112px" className="object-cover" />
            <button
              type="button"
              aria-label={t('removePhoto', { n: i + 1 })}
              onClick={() => onRemoveExisting(photo.id)}
              className={remove}
            >
              <X size={15} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        ))}
        {added.map((photo, i) => (
          <div key={photo.key} className={tile}>
            <Image
              src={photo.previewUrl}
              alt=""
              fill
              unoptimized
              sizes="112px"
              className="object-cover"
            />
            <button
              type="button"
              aria-label={t('removePhoto', { n: existing.length + i + 1 })}
              onClick={() => {
                URL.revokeObjectURL(photo.previewUrl);
                onRemoveAdded(photo.key);
              }}
              className={remove}
            >
              <X size={15} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => void pick(event.target.files)}
      />
      {problem && <ProblemText code={problem} />}
    </div>
  );
}

function ProblemText({ code }: { code: string }) {
  const t = useTranslations('errors');
  return (
    <p role="alert" className="m-0 text-sm font-semibold text-danger">
      {t(code as never)}
    </p>
  );
}
