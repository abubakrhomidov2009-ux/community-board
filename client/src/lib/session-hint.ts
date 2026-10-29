// A small cookie that only says "this browser probably has a login". It holds no secret.
// The real login cookies are httpOnly (JavaScript cannot see them). The hint lets the proxy and the
// UI skip pointless requests for guests, and avoid a flash of the wrong page.
const NAME = 'cb_session';
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const EVENT = 'cb-session-hint';

// Set while the person is logging out, so the page they leave does not send them to the Log in modal.
let signingOut = false;
export const beginSignOut = () => {
  signingOut = true;
};
export const isSigningOut = () => signingOut;

export const SESSION_HINT_COOKIE = NAME;

export function hasSessionHint(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.cookie.split('; ').some((c) => c.startsWith(`${NAME}=`))
  );
}

export function setSessionHint(): void {
  signingOut = false;
  document.cookie = `${NAME}=1; path=/; max-age=${THIRTY_DAYS}; samesite=lax`;
  window.dispatchEvent(new Event(EVENT));
}

export function clearSessionHint(): void {
  document.cookie = `${NAME}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event(EVENT));
}

/** For useSyncExternalStore. */
export function subscribeSessionHint(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
