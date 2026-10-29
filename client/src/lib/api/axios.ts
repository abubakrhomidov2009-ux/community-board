import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from './errors';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not try to refresh the login on 401 (used by the auth calls themselves). */
    skipAuthRefresh?: boolean;
    _retried?: boolean;
  }
}

/** The one Axios instance of the app. The browser calls /api on this site; Next.js forwards it to the backend. */
export const api = axios.create({ baseURL: '/api', withCredentials: true });

let onSessionExpired: (() => void) | null = null;

/** The app registers what happens when the login cannot be renewed any more (it opens the Log in modal). */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

// Only one refresh at a time: requests that fail while it runs wait for the same answer.
let refreshing: Promise<void> | null = null;

function refreshLogin(): Promise<void> {
  refreshing ??= api
    .post('/auth/refresh', undefined, { skipAuthRefresh: true })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const apiError = toApiError(error);

    // The login token lasts 15 minutes. On 401 UNAUTHORIZED get a new one quietly and repeat the request once.
    if (
      config &&
      apiError.errorCode === 'UNAUTHORIZED' &&
      !config.skipAuthRefresh &&
      !config._retried
    ) {
      config._retried = true;
      try {
        await refreshLogin();
        return await api.request(config);
      } catch (refreshError) {
        const failed = toApiError(refreshError);
        if (failed.errorCode === 'REFRESH_TOKEN_INVALID' || failed.errorCode === 'UNAUTHORIZED') {
          onSessionExpired?.();
        }
        throw failed;
      }
    }
    throw apiError;
  },
);
