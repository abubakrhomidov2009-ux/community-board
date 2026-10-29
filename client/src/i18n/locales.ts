// The languages of the site. Kept free of libraries so any file (and the tests) can import it.
export const locales = ['en', 'ru', 'tg'] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
