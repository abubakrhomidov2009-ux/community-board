'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { STORAGE_KEY, THEME_COOKIE } from './theme-script';

// A small Light / Dark / System switch, written by us (next-themes puts a <script> inside a React component and
// React 19 warns about that). The choice is saved in localStorage and in a cookie: the server reads the cookie and
// puts the class on <html> before the first paint, and "System" is handled by CSS. No script, no flash.

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

function apply(theme: Theme) {
  const root = document.documentElement;
  // "system" = no class: the CSS follows the device setting.
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

function readSaved(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // Another tab changed the theme: follow it.
    if (event.key === STORAGE_KEY) {
      apply(readSaved());
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The saved choice lives in localStorage; the server (and the first paint) say "system".
  const theme = useSyncExternalStore(subscribe, readSaved, () => 'system' as Theme);

  // Make the page match the saved choice (also fixes a cookie that is missing or old).
  useEffect(() => {
    apply(readSaved());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts until the page closes.
    }
    apply(next);
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
