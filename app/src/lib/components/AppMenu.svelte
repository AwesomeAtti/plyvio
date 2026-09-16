<script>
  import Icon from '$lib/components/Icon.svelte';
  import { ScrollLeft as BackArrow } from '$lib/icons.js';
  import Popover from './Popover.svelte';
  import MenuItem from './MenuItem.svelte';
  import { t, locale, locales, setLocale } from '$lib/stores/i18n.js';
  import { theme, toggleTheme } from '$lib/stores/theme.js';
  import { openSettings } from '$lib/stores/tabs.js';
  import {
    isFullscreen, fullscreenSupported, toggleFullscreen, quit
  } from '$lib/stores/appCommands.js';

  let { ondismiss, onnavigate } = $props();

  let showLanguages = $state(false);

  const currentLabel = $derived((locales.find((l) => l.code === $locale) || locales[0]).label);
  const themeLabel = $derived($theme === 'dark' ? $t('theme.dark') : $t('theme.light'));

  function pickLocale(code) {
    setLocale(code);
    showLanguages = false;
    ondismiss?.();
  }
  function onTheme() {
    toggleTheme();          // applies immediately, no submenu (§2.2)
    ondismiss?.();
  }
  const canFullscreen = fullscreenSupported();

  async function onFullscreen() {
    ondismiss?.();
    await toggleFullscreen();     // menu click supplies the required gesture
  }

  function onQuit() {
    ondismiss?.();
    quit();
  }

  function onSettings() { openSettings(); ondismiss?.(); }
  function onAbout() {
    openSettings();
    onnavigate?.({ section: 'about' });   // §2.2 — jump to About
    ondismiss?.();
  }
</script>

<Popover {ondismiss}>
  {#if showLanguages}
    <MenuItem kind="label">{$t('menu.language')}</MenuItem>
    {#each locales as l (l.code)}
      <MenuItem checked={l.code === $locale} onclick={() => pickLocale(l.code)}>
        {l.label}
      </MenuItem>
    {/each}
    <div class="rule"></div>
    <MenuItem onclick={() => (showLanguages = false)}><Icon icon={BackArrow} size={13} /> {$t('ctl.menu')}</MenuItem>
  {:else}
    <MenuItem submenu value={currentLabel} onclick={() => (showLanguages = true)}>
      {$t('menu.language')}
    </MenuItem>
    <MenuItem value={themeLabel} onclick={onTheme}>
      {$t('menu.theme')}
    </MenuItem>
    {#if canFullscreen}
      <MenuItem
        value={$isFullscreen ? $t('fullscreen.exit') : $t('fullscreen.enter')}
        onclick={onFullscreen}
      >
        {$t('menu.fullscreen')}
      </MenuItem>
    {/if}
    <div class="rule"></div>
    <MenuItem onclick={onSettings}>{$t('menu.settings')}</MenuItem>
    <MenuItem onclick={onAbout}>{$t('menu.about')}</MenuItem>
    <div class="rule"></div>
    <MenuItem onclick={onQuit}>{$t('menu.quit')}</MenuItem>
  {/if}
</Popover>

<style>
  .rule { height: 1px; background: var(--rule); margin: 4px 2px; }
</style>
