'use client';

import { MapPin as MapPinIcon, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/shared/Skeleton';
import { Link } from '@/i18n/navigation';
import type { MapPin, PostFilters } from '../api';
import { useMapPins } from '../queries';

// Leaflet only works in the browser and is heavy: it is downloaded only when a map is shown.
const Loading = () => <Skeleton className="size-full rounded-[inherit]" />;
const PickerMap = dynamic(() => import('./MapInner').then((m) => m.MapPickerInner), {
  ssr: false,
  loading: Loading,
});
const PinMap = dynamic(() => import('./MapInner').then((m) => m.MapPinInner), {
  ssr: false,
  loading: Loading,
});
const BoardMap = dynamic(() => import('./MapInner').then((m) => m.BoardMapInner), {
  ssr: false,
  loading: Loading,
});

/** The pin picker of the create/edit form (optional). */
export function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number } | null) => void;
}) {
  const t = useTranslations('map');
  return (
    <div className="flex flex-col gap-2.5">
      <div className="h-[260px] overflow-hidden rounded-[18px] border border-border bg-soft">
        <PickerMap value={value} onChange={onChange} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-muted">{value ? t('pinned') : t('tapToPin')}</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-danger"
          >
            <X size={15} strokeWidth={2.2} aria-hidden="true" />
            {t('removePin')}
          </button>
        )}
      </div>
    </div>
  );
}

/** The location card on the post page. */
export function PostMap({ lat, lng, district }: { lat: number; lng: number; district: string }) {
  const t = useTranslations('map');
  return (
    <section
      className="overflow-hidden rounded-[24px] border border-border bg-paper"
      aria-label={t('title')}
    >
      <div className="h-[220px] bg-soft">
        <PinMap lat={lat} lng={lng} />
      </div>
      <p className="m-0 flex items-center gap-2 px-[18px] py-3 text-xs text-body-2">
        <MapPinIcon size={14} strokeWidth={2} aria-hidden="true" />
        {district}
      </p>
    </section>
  );
}

/** The board as a map (the "Map" view). */
export function BoardMapView({
  filters,
  popupLabel,
}: {
  filters: PostFilters;
  popupLabel: (pin: MapPin) => string;
}) {
  const t = useTranslations('map');
  const pins = useMapPins(filters, true);
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[calc(100dvh-340px)] min-h-[360px] overflow-hidden rounded-[24px] border border-border bg-soft">
        <BoardMap
          pins={pins.data ?? []}
          renderPopup={(pin) => (
            <div className="flex flex-col gap-1">
              <b className="text-sm">{pin.title}</b>
              <span className="text-xs">{popupLabel(pin)}</span>
              <Link href={`/posts/${pin.id}`} className="text-sm font-bold">
                {t('open')}
              </Link>
            </div>
          )}
        />
      </div>
      {pins.isSuccess && pins.data.length === 0 && (
        <p className="m-0 text-center text-sm text-body-2">{t('noPins')}</p>
      )}
    </div>
  );
}
