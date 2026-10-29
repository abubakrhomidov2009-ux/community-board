import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, routing } from './i18n/routing';
import { SESSION_HINT_COOKIE } from './lib/session-hint';

const handleLocale = createMiddleware(routing);

// Pages a guest may open. Everything else needs a login.
const PUBLIC_PATHS = new Set(['', '/about']);

/**
 * 1. Puts the language in the address (/en, /ru, /tg).
 * 2. Guests who open any page except About are sent to About with the Log in modal open
 *    (?login=1&next=...). After login the app sends them back to the page they wanted.
 *    This only looks for the "has a login" hint cookie; the backend does the real check.
 */
export default function proxy(request: NextRequest) {
  const response = handleLocale(request);
  // The language redirect (for example / -> /en) goes first.
  if (response.headers.has('location')) return response;

  const { pathname, search } = request.nextUrl;
  const [, first, ...rest] = pathname.split('/');
  if (!isLocale(first)) return response;

  const path = rest.length ? `/${rest.join('/')}`.replace(/\/$/, '') : '';
  if (PUBLIC_PATHS.has(path)) return response;
  if (request.cookies.has(SESSION_HINT_COOKIE)) return response;

  const url = request.nextUrl.clone();
  url.pathname = `/${first}`;
  url.search = `?login=1&next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip the API, Next.js internals and files with an extension (images, icons).
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
