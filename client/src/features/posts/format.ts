import type { Post } from './api';
import type { SlipData, SlipKind, SlipStatus } from '@/components/shared/PostSlip';

export const KIND_OF: Record<Post['category'], SlipKind> = {
  LOST_FOUND: 'lost',
  TUTORING: 'tutor',
  RENTALS: 'rent',
  OTHER: 'other',
};

const STATUS_OF: Partial<Record<Post['status'], SlipStatus>> = {
  RESOLVED: 'resolved',
  EXPIRED: 'expired',
  REMOVED: 'removed',
};

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "2 h ago", "yesterday": in the language of the page. */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2_592_000],
    ['year', 31_536_000],
  ];
  if (Math.abs(seconds) < 60) return formatter.format(0, 'second');
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  let size = 60;
  for (const [candidate, candidateSize] of steps) {
    if (Math.abs(seconds) >= candidateSize) {
      unit = candidate;
      size = candidateSize;
    }
  }
  return formatter.format(Math.round(seconds / size), unit);
}

/** "800 somoni / month", "Free", or "Ask the author". Prices are whole somoni. */
export function priceText(post: Post, t: Translate, locale: string): string {
  if (post.price === null) return t('price.ask');
  if (post.price === 0) return t('price.free');
  const amount = new Intl.NumberFormat(locale).format(post.price);
  if (post.priceUnit === 'PER_HOUR') return t('price.perHour', { amount });
  if (post.priceUnit === 'PER_MONTH') return t('price.perMonth', { amount });
  return t('price.once', { amount });
}

/** Turns a post from the API into what a slip shows. */
export function toSlip(post: Post, t: Translate, locale: string): SlipData {
  const photo = [...post.images].sort((a, b) => a.position - b.position)[0];
  return {
    id: post.id,
    kind: KIND_OF[post.category],
    categoryLabel: t(`category.${post.category}`),
    time: timeAgo(post.createdAt, locale),
    title: post.title,
    price: priceText(post, t, locale),
    district: t(`district.${post.district}`),
    photo: Boolean(photo),
    photoUrl: photo?.url,
    status: STATUS_OF[post.status],
    saved: post.isFavorite,
    telegram: post.contactTelegram ?? undefined,
    phone: post.contactPhone ?? undefined,
  };
}
