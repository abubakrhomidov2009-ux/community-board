import { locales } from '@/i18n/locales';

/**
 * Where to go after login. Only paths inside this site are allowed (no other website, no `//host`),
 * so a crafted link cannot send a user somewhere else. Anything else falls back to `fallback`.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return fallback;
  const first = next.split('/')[1]?.split(/[?#]/)[0];
  if (!first || !(locales as readonly string[]).includes(first)) return fallback;
  return next;
}
