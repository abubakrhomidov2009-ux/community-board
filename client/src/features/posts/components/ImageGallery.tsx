'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Post } from '../api';
import { CategoryArt } from './CategoryArt';

/**
 * The photos of a post: swipe on a phone (with momentum), arrows and keyboard on a laptop, thumbnails
 * under the big photo. Without photos it shows the big category icon like the board does.
 */
export function ImageGallery({
  images,
  category,
}: {
  images: Post['images'];
  category: Post['category'];
}) {
  const t = useTranslations('post');
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setIndex(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla, onSelect]);

  if (sorted.length === 0) {
    return (
      <div className="aspect-[4/3] max-h-[300px] w-full md:max-h-none md:rounded-[26px] md:border md:border-border">
        <CategoryArt category={category} className="size-full md:rounded-[26px]" />
      </div>
    );
  }

  const many = sorted.length > 1;

  return (
    <div className="flex flex-col gap-3.5">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={t('photoLabel')}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') embla?.scrollPrev();
          if (event.key === 'ArrowRight') embla?.scrollNext();
        }}
        className="relative overflow-hidden bg-soft outline-none focus-visible:ring-2 focus-visible:ring-primary md:rounded-[26px] md:border md:border-border"
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {sorted.map((image, i) => (
              <div
                key={image.id}
                role="group"
                aria-roledescription="slide"
                aria-label={t('photoCount', { n: i + 1, total: sorted.length })}
                className="relative aspect-[4/3] max-h-[340px] min-w-0 flex-[0_0_100%] md:max-h-none"
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 700px, 100vw"
                  priority={i === 0}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {many && (
          <>
            <button
              type="button"
              aria-label={t('prev')}
              onClick={() => embla?.scrollPrev()}
              disabled={index === 0}
              className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper text-ink disabled:opacity-40 md:flex"
            >
              <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t('next')}
              onClick={() => embla?.scrollNext()}
              disabled={index === sorted.length - 1}
              className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper text-ink disabled:opacity-40 md:flex"
            >
              <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="absolute bottom-10 right-3.5 flex h-7 items-center rounded-full bg-ink px-2.5 text-xs font-bold text-on-ink md:bottom-[18px] md:left-[18px] md:right-auto md:h-8 md:px-3 md:text-[13px]">
              {t('photoCount', { n: index + 1, total: sorted.length })}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="hidden grid-cols-5 gap-2.5 md:grid">
          {sorted.map((image, i) => (
            <button
              key={image.id}
              type="button"
              aria-label={t('photoN', { n: i + 1 })}
              aria-current={i === index}
              onClick={() => embla?.scrollTo(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-[14px] bg-soft',
                i === index ? 'border-2 border-ink' : 'border border-border',
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                unoptimized
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
