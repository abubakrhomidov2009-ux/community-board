'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Drawer } from 'vaul';
import { CATEGORIES, DISTRICTS, type Category, type District, type PostFilters } from '../api';
import { activeFilterCount } from '../filters';
import { Chip } from './Chip';
import { PriceFields, toPrice } from './PriceFilter';

/**
 * Phone filters: a bottom sheet (a slip with a pin) with What / Where / Price.
 * Nothing changes on the board until "Show results" is pressed.
 */
export function FilterSheet({
  filters,
  total,
  onApply,
}: {
  filters: PostFilters;
  /** How many slips the board shows right now (for the button text). */
  total: number | undefined;
  onApply: (patch: Partial<PostFilters>) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | undefined>();
  const [district, setDistrict] = useState<District | undefined>();
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const count = activeFilterCount(filters);

  function openSheet() {
    setCategory(filters.category);
    setDistrict(filters.district);
    setMin(filters.minPrice?.toString() ?? '');
    setMax(filters.maxPrice?.toString() ?? '');
    setOpen(true);
  }

  const legend = 'mb-2.5 text-xs font-bold uppercase tracking-[0.8px] text-body-2';

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={openSheet}
        className="flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-paper px-3.5 text-sm font-bold text-ink"
      >
        <SlidersHorizontal size={15} strokeWidth={2} aria-hidden="true" />
        {count > 0 ? t('board.filtersCount', { count }) : t('board.filters')}
      </button>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-2.5 bottom-4 z-50 max-h-[calc(100dvh-24px)] overflow-y-auto pt-3 outline-none"
        >
          <section className="relative rounded-[8px_8px_24px_24px] border border-border bg-paper">
            <span
              aria-hidden="true"
              className="pin-dot absolute -top-2.5 left-1/2 -ml-2.5 size-5 rounded-full"
            />
            <div className="h-[7px] rounded-[7px_7px_0_0] bg-ink" />
            <div className="flex flex-col gap-[18px] p-[18px]">
              <Drawer.Title className="m-0 font-display text-[22px] font-bold tracking-[-0.5px]">
                {t('board.filtersTitle')}
              </Drawer.Title>

              <fieldset className="m-0 border-0 p-0">
                <legend className={legend}>{t('board.what')}</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((item) => (
                    <Chip
                      key={item}
                      pressed={category === item}
                      onClick={() => setCategory(category === item ? undefined : item)}
                    >
                      {t(`category.${item}`)}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="m-0 border-0 p-0">
                <legend className={legend}>{t('board.where')}</legend>
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.map((item) => (
                    <Chip
                      key={item}
                      tone="green"
                      pressed={district === item}
                      onClick={() => setDistrict(district === item ? undefined : item)}
                    >
                      {t(`district.${item}`)}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="m-0 border-0 p-0">
                <legend className={legend}>{t('board.priceTitle')}</legend>
                <PriceFields min={min} max={max} onMin={setMin} onMax={setMax} />
              </fieldset>
            </div>

            <div className="grid grid-cols-2 border-t-[1.5px] border-dashed border-line">
              <button
                type="button"
                onClick={() => {
                  setCategory(undefined);
                  setDistrict(undefined);
                  setMin('');
                  setMax('');
                }}
                className="h-[58px] border-0 border-r-[1.5px] border-dashed border-line bg-transparent text-[15px] font-bold text-ink"
              >
                {t('board.reset')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply({
                    category,
                    district,
                    minPrice: toPrice(min),
                    maxPrice: toPrice(max),
                  });
                  setOpen(false);
                }}
                className="h-[58px] border-0 bg-transparent text-[15px] font-bold text-primary"
              >
                {total === undefined ? t('board.apply') : t('board.showResults', { count: total })}
              </button>
            </div>
          </section>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
