'use client';

import { useEffect } from 'react';

/** Registers the service worker (installable app + offline page). Only in the real build, not while developing. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
