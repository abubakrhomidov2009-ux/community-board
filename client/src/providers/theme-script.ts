// Shared by the theme provider (a client file) and the server layout, so it must not be a client file itself.
export const STORAGE_KEY = 'theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Runs before the first paint: puts the `dark` class on <html> when needed (no flash of the wrong theme). */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('${DARK_QUERY}').matches);var h=document.documentElement;h.classList.toggle('dark',d);h.style.colorScheme=d?'dark':'light'}catch(e){}`;
