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

// A small Light / Dark / System switch. We wrote it ourselves because next-themes puts a <script>
// inside a React component, and React 19 warns about that. The first-paint script lives in
// THEME_SCRIPT (printed by the server layout), so there is no warning and no flash of the wrong theme.

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Runs before the first paint: puts the `dark` class on <html> when needed. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('${DARK_QUERY}').matches);var h=document.documentElement;h.classList.toggle('dark',d);h.style.colorScheme=d?'dark':'light'}catch(e){}`;

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
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
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The saved choice lives in localStorage; the server (and the first paint) say "system".
  const theme = useSyncExternalStore(subscribe, readSaved, () => 'system' as Theme);

  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return;
    const query = matchMedia(DARK_QUERY);
    const onChange = () => apply('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: nothing to save.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
