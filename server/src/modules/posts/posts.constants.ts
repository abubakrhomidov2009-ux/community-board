import { Category, PostStatus } from '@prisma/client';

/** A post stays visible for this many days after it is created (or renewed). */
export const POST_LIFETIME_DAYS = 30;

/** Price and price unit are only allowed for these categories. */
export const PRICE_CATEGORIES: Category[] = [
  Category.TUTORING,
  Category.RENTALS,
];

/** Statuses shown in public lists. EXPIRED and REMOVED posts never appear there. */
export const PUBLIC_STATUSES: PostStatus[] = [
  PostStatus.ACTIVE,
  PostStatus.RESOLVED,
];

export const MAX_PRICE = 1_000_000;

/** The expiry sweep on read runs at most this often per server (it writes to the database). */
export const EXPIRE_SWEEP_INTERVAL_MS = 60_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
