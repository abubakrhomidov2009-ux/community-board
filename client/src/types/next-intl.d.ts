import type en from '../../messages/en.json';
import type { Locale } from '@/i18n/routing';

// Makes every translation key type-checked (a wrong key is a compile error).
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
