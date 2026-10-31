// Shared by the theme provider (a client file) and the server layout, so it must not be a client file itself.
export const STORAGE_KEY = 'theme';
/** The same choice as a cookie, so the server can put the class on <html> before the first paint. */
export const THEME_COOKIE = 'theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';
