import type { Post } from './api';
import { priceText, timeAgo } from './format';

const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}:${values.amount}` : key;
const post = (price: number | null, priceUnit: Post['priceUnit']) => ({ price, priceUnit }) as Post;

describe('priceText', () => {
  it('shows free, ask and the units', () => {
    expect(priceText(post(null, null), t, 'en')).toBe('price.ask');
    expect(priceText(post(0, 'ONCE'), t, 'en')).toBe('price.free');
    expect(priceText(post(800, 'PER_MONTH'), t, 'en')).toBe('price.perMonth:800');
    expect(priceText(post(50, 'PER_HOUR'), t, 'en')).toBe('price.perHour:50');
    expect(priceText(post(1200, 'ONCE'), t, 'en')).toBe('price.once:1,200');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-10-28T12:00:00Z');
  it('gives short, readable times', () => {
    expect(timeAgo('2026-10-28T11:59:40Z', 'en', now)).toMatch(/now/i);
    expect(timeAgo('2026-10-28T10:00:00Z', 'en', now)).toMatch(/2 hr/);
    expect(timeAgo('2026-10-27T12:00:00Z', 'en', now)).toMatch(/yesterday/i);
    expect(timeAgo('2026-10-25T12:00:00Z', 'en', now)).toMatch(/3 days/);
  });
});
