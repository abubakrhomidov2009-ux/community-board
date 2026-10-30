'use client';

import { Popover } from '@base-ui/react/popover';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { pillClass } from '@/components/shared/pill-button';
import { cn } from '@/lib/utils';

export interface PriceRange {
  minPrice?: number;
  maxPrice?: number;
}

/** "" or digits only, turned into a number the backend accepts. */
export const toPrice = (text: string): number | undefined => {
  const digits = text.replace(/\D/g, '').slice(0, 9);
  return digits === '' ? undefined : Number(digits);
};

/** Min and max boxes. 16px text so phones do not zoom in. */
export function PriceFields({
  min,
  max,
  onMin,
  onMax,
}: {
  min: string;
  max: string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
}) {
  const t = useTranslations('board');
  const box =
    'h-12 min-w-0 flex-1 rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-base text-ink placeholder:text-muted focus:border-ink';
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="price-min">
        {t('min')}
      </label>
      <input
        id="price-min"
        inputMode="numeric"
        value={min}
        onChange={(event) => onMin(event.target.value.replace(/\D/g, ''))}
        placeholder={t('min')}
        className={box}
      />
      <span aria-hidden="true" className="text-body-2">
        –
      </span>
      <label className="sr-only" htmlFor="price-max">
        {t('max')}
      </label>
      <input
        id="price-max"
        inputMode="numeric"
        value={max}
        onChange={(event) => onMax(event.target.value.replace(/\D/g, ''))}
        placeholder={t('max')}
        className={box}
      />
    </div>
  );
}

/** The laptop "Price" button with a small panel under it. */
export function PriceFilter({
  value,
  onApply,
}: {
  value: PriceRange;
  onApply: (range: PriceRange) => void;
}) {
  const t = useTranslations('board');
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const active = value.minPrice !== undefined || value.maxPrice !== undefined;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          // Start from what is applied right now.
          setMin(value.minPrice?.toString() ?? '');
          setMax(value.maxPrice?.toString() ?? '');
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        className={cn(
          'flex h-10 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-semibold text-ink transition-colors duration-150',
          active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-paper hover:border-ink',
        )}
      >
        <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
        {t('price')}
        {active && (
          <span className="text-xs font-bold">
            {value.minPrice ?? 0}–{value.maxPrice ?? '∞'}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-40">
          <Popover.Popup className="w-[320px] rounded-[18px] border border-border bg-paper p-4 shadow-[0_12px_32px_rgba(14,26,23,0.14)] outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <p className="m-0 mb-3 text-xs font-bold uppercase tracking-[0.8px] text-body-2">
              {t('priceTitle')}
            </p>
            <PriceFields min={min} max={max} onMin={setMin} onMax={setMax} />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={pillClass('outline', 'md', 'flex-1')}
                onClick={() => {
                  onApply({});
                  setOpen(false);
                }}
              >
                {t('reset')}
              </button>
              <button
                type="button"
                className={pillClass('ink', 'md', 'flex-1')}
                onClick={() => {
                  onApply({ minPrice: toPrice(min), maxPrice: toPrice(max) });
                  setOpen(false);
                }}
              >
                {t('apply')}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
