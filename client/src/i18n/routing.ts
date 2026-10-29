import { defineRouting } from 'next-intl/routing';
import { locales } from './locales';

export { isLocale, locales, type Locale } from './locales';

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});
