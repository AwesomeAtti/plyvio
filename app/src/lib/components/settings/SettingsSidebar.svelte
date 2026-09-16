<script>
  /**
   * §3.4.4 — persistent navigation within the Settings Workspace.
   *
   * Fixed 220px (approved 3 Sep). Never collapses, never scrolls horizontally
   * with the Content Area, and creates no tabs — all navigation stays inside
   * the single Settings Tab. (§3.4.3)
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { SECTIONS } from '$lib/settings/schema.js';
  import { activeSection, selectSection } from '$lib/stores/settings.js';

  /**
   * Roving focus: ↑ ↓ move between sections, Enter/Space selects.
   *
   * The handler sits on each tab rather than on the tablist container: the
   * container must not be focusable under the ARIA tabs pattern, and putting
   * an interactive handler on a non-focusable element is what the a11y rule
   * warns about.
   */
  function onKeydown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...e.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    const i = items.indexOf(e.currentTarget);
    if (i === -1) return;
    e.preventDefault();
    const next = items[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) next.focus();
  }
</script>

<div
  class="sidebar"
  role="tablist"
  aria-orientation="vertical"
  aria-label={$t('settings.nav')}
>
  {#each SECTIONS as s (s.id)}
    <button
      class="nav"
      class:on={$activeSection === s.id}
      type="button"
      role="tab"
      aria-selected={$activeSection === s.id}
      aria-controls="settings-content"
      tabindex={$activeSection === s.id ? 0 : -1}
      data-section={s.id}
      onclick={() => selectSection(s.id)}
      onkeydown={onKeydown}
    >
      <span class="ic"><Icon icon={s.icon} size={18} /></span>
      <span class="lbl">{$t(s.labelKey)}</span>
    </button>
  {/each}
</div>

<style>
  .sidebar {
    flex: none;
    width: var(--settings-sidebar-w);   /* fixed 220px — §3.4.4, approved 3 Sep */
    border-right: 1px solid var(--rule-strong);
    background: var(--chrome);
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;             /* only if height cannot fit six items */
    overflow-x: hidden;
  }

  .nav {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    /*
      §3.4.13 — 44px, like every other row in the workspace. This was
      padding-driven (9px + ~19.5px of text + 9px ≈ 37.5px), so the Sidebar
      sat two rows out of step with the Content Area beside it by the sixth
      item. The 44px decision exists to put both regions on one rhythm.
    */
    height: 44px;
    padding: 0 14px;
    text-align: left;
    font-size: 13.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .nav:hover { background: var(--chrome-2); color: var(--ink-2); }

  /*
    §3.4.4 — the active state must not rely on colour alone. Three redundant
    cues: a positional rail, bold weight, and the surface fill that ties the
    item to the Content Area beside it.
  */
  .nav.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
  }
  .nav.on::before {
    content: "";
    position: absolute;
    left: 0; top: 4px; bottom: 4px;
    width: 3px;
    background: var(--ink);
  }

  /*
    §3.4.4 / §7.4 — the section glyph. 18px in an 18px slot, the same as an
    object row's leading glyph, because both sit on a 44px row and a sidebar
    that used a different size would put the two regions out of step.

    This replaced an 11px bordered square that stood in for an icon. §3.4.4 has
    required a leading icon since it was written; the placeholder was a gap in
    the build, not a design.
  */
  .ic {
    flex: none;
    width: 18px; height: 18px;
    display: grid; place-items: center;
    color: var(--muted);
  }
  .nav.on .ic { color: var(--ink); }

  .lbl { overflow: hidden; text-overflow: ellipsis; }

  @media (forced-colors: active) {
    .nav.on { forced-color-adjust: none; }
  }
</style>
