import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'plyvio.theme';

function initial() {
  if (!browser) return 'light';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable(initial());

theme.subscribe((v) => {
  if (!browser) return;
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  document.documentElement.setAttribute('data-theme', v);
});

export function toggleTheme() {
  theme.update((v) => (v === 'dark' ? 'light' : 'dark'));
}
