import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { LOCALES, STRINGS } from '$lib/i18n/locales.js';

const KEY = 'plyvio.locale';
const DEFAULT = 'en';

function initial() {
  if (!browser) return DEFAULT;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && STRINGS[saved]) return saved;
    const nav = (navigator.language || '').slice(0, 2);
    if (STRINGS[nav]) return nav;
  } catch { /* storage unavailable */ }
  return DEFAULT;
}

export const locale = writable(initial());

locale.subscribe((v) => {
  if (!browser) return;
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  document.documentElement.lang = v;
});

/** t('key', { name: 'x' }) — falls back to English, then to the key itself. */
export const t = derived(locale, ($l) => (key, vars) => {
  let s = (STRINGS[$l] && STRINGS[$l][key]) ?? STRINGS[DEFAULT][key] ?? key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
});

export const locales = LOCALES;
export function setLocale(code) { if (STRINGS[code]) locale.set(code); }
export function currentLocaleLabel() {
  const c = get(locale);
  return (LOCALES.find((l) => l.code === c) || LOCALES[0]).label;
}
