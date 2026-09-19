<script>
  /**
   * Settings Workspace — §3.4
   *
   * Two regions: a fixed 220px Sidebar and a Content Area that takes the rest
   * and is the only scrolling region. The workspace fills the Workspace Area
   * and inherits its box from the Application Shell.
   */
  import { t, locale, locales, setLocale } from '$lib/stores/i18n.js';
  import { theme } from '$lib/stores/theme.js';
  import SettingsSidebar from './SettingsSidebar.svelte';
  import ObjectSection from './ObjectSection.svelte';
  import DatabaseSection from './DatabaseSection.svelte';
  import EngineSection from './EngineSection.svelte';
  import SubscriptionSection from './SubscriptionSection.svelte';
  import ObjectDetail from './ObjectDetail.svelte';
  import SettingRow from './SettingRow.svelte';
  import { SECTIONS, sectionKind } from '$lib/settings/schema.js';
  import {
    activeSection, openObject, preferences, applyPreference
  } from '$lib/stores/settings.js';
  import { OUTCOMES } from '$lib/library/importJob.js';

  /* Injected from package.json at build time — see vite.config.js. */
  const VERSION = __APP_VERSION__;

  let { aboutFocus = false } = $props();

  const section = $derived(SECTIONS.find((s) => s.id === $activeSection) ?? SECTIONS[0]);
  const heading = $derived($t(section.labelKey));
  const kind = $derived(sectionKind($activeSection));

  // The Detail/Edit View only applies to the section it belongs to.
  const detail = $derived(
    $openObject && $openObject.section === $activeSection ? $openObject : null
  );

  function setTheme(v) { theme.set(v === 'Dark' ? 'dark' : 'light'); }
</script>

<div class="ws">
  <SettingsSidebar />

  <div class="content" id="settings-content" role="tabpanel" aria-label={heading} tabindex="-1">
    {#if detail}
      <ObjectDetail section={detail.section} id={detail.id} sectionLabel={heading} />

    {:else if $activeSection === 'engines'}
      <!-- §3.4.8.2 — rows, not cards. Accepted 4 Sep. -->
      <EngineSection {heading} />

    {:else if $activeSection === 'subscriptions'}
      <!-- SU-A — rows, one group. Accepted 4 Sep; not yet specified. -->
      <SubscriptionSection {heading} />

    {:else if $activeSection === 'databases'}
      <!-- §3.4.8 — rows, not cards. Accepted 4 Sep. -->
      <DatabaseSection {heading} />

    {:else if kind === 'objects'}
      <ObjectSection section={$activeSection} {heading} />

    {:else if $activeSection === 'general'}
      <div class="chead"><h2>{heading}</h2></div>
      <div class="scroll">
        <p class="glab">{$t('settings.group.startup')}</p>
        <div class="box">
          <SettingRow
            label={$t('pref.restoreGames')}
            type="toggle"
            value={$preferences.restoreOpenGames}
            oncommit={(v) => applyPreference('restoreOpenGames', v)}
          />
        </div>

        <p class="glab two">{$t('settings.group.language')}</p>
        <div class="box">
          <SettingRow
            label={$t('pref.language')}
            type="select"
            options={locales.map((l) => l.label)}
            value={(locales.find((l) => l.code === $locale) ?? locales[0]).label}
            oncommit={(v) => setLocale((locales.find((l) => l.label === v) ?? locales[0]).code)}
          />
        </div>

        <p class="glab two">{$t('settings.group.storage')}</p>
        <div class="box">
          <!--
            §3.4.6 — a path is chosen, not typed. It was a free-text field, which
            invites a path that does not exist, and §3.4.1's auto-apply means there
            is no Save to validate against. Reported as a value, with the action
            beside it — the shape the Engines expander already uses for Location.
          -->
          <div class="crow">
            <span class="ctext"><span class="clbl">{$t('pref.libraryLocation')}</span></span>
            <span class="cval">{$preferences.libraryLocation}</span>
            <button class="cbtn" type="button">{$t('pref.changeLocation')}</button>
          </div>
        </div>

        <!--
          PROTOTYPE ONLY — not in §3.4, and not a preference.

          §3.2.4.5's import reads no PGN, so its result has to be chosen rather
          than discovered. The alternative is a hidden convention, which leaves
          half of the specified behaviour unreachable unless you know the trick.
          It is last in the section because it is the least important row in it.
        -->
        <p class="glab two">{$t('settings.group.prototype')}</p>
        <div class="box">
          <SettingRow
            label={$t('pref.simulatedImport')}
            type="select"
            options={OUTCOMES.map((o) => $t(`proto.${o}`))}
            value={$t(`proto.${$preferences.simulatedImport}`)}
            oncommit={(v) => applyPreference(
              'simulatedImport',
              OUTCOMES.find((o) => $t(`proto.${o}`) === v) ?? 'clean'
            )}
          />
        </div>
      </div>

    {:else if $activeSection === 'appearance'}
      <div class="chead"><h2>{heading}</h2></div>
      <div class="scroll">
        <p class="glab">{$t('settings.group.theme')}</p>
        <div class="box">
          <SettingRow
            label={$t('pref.theme')}
            type="select"
            options={[$t('theme.light'), $t('theme.dark')]}
            value={$theme === 'dark' ? $t('theme.dark') : $t('theme.light')}
            oncommit={(v) => setTheme(v === $t('theme.dark') ? 'Dark' : 'Light')}
          />
        </div>

        <p class="glab two">{$t('settings.group.board')}</p>
        <div class="box">
          <SettingRow
            label={$t('pref.boardStyle')}
            type="select"
            options={['Default', 'Wood', 'Blue', 'Monochrome']}
            value={$preferences.boardStyle}
            oncommit={(v) => applyPreference('boardStyle', v)}
          />
          <SettingRow
            label={$t('pref.pieceSet')}
            type="select"
            options={['Merida', 'Alpha', 'Leipzig']}
            value={$preferences.pieceSet}
            oncommit={(v) => applyPreference('pieceSet', v)}
          />
        </div>
      </div>

    {:else}
      <!--
        §3.4.11 — informational. Boxed label/value groups on the object sections'
        44px rhythm, which is what retires the U+265E mark that used to sit here:
        it was absent from the bundled latin subsets, so the About screen's
        identity mark was drawn by whatever the operating system substituted.
        Once About is boxed groups the mark is not a layout element at all.
      -->
      <div class="chead"><h2>{heading}</h2></div>
      <div class="scroll" class:flash={aboutFocus}>
        <p class="glab">{$t('about.group.application')}</p>
        <dl class="box">
          <div class="arow"><dt class="anm">{$t('about.application')}</dt><dd class="adt">{$t('app.name')}</dd></div>
          <div class="arow"><dt class="anm">{$t('about.version')}</dt><dd class="adt">{$t('about.versionValue', { version: VERSION })}</dd></div>
          <div class="arow"><dt class="anm">{$t('about.licence')}</dt><dd class="adt">GPL-3.0-or-later</dd></div>
          <div class="arow"><dt class="anm">{$t('about.dataLocation')}</dt><dd class="adt">{$t('about.local')}</dd></div>
        </dl>

        <p class="glab two">{$t('about.group.thirdParty')}</p>
        <dl class="box">
          <div class="arow"><dt class="anm">Chessground</dt><dd class="adt">GPL-3.0-or-later</dd></div>
          <div class="arow"><dt class="anm">chessops</dt><dd class="adt">GPL-3.0-or-later</dd></div>
          <div class="arow"><dt class="anm">Svelte</dt><dd class="adt">MIT</dd></div>
          <div class="arow"><dt class="anm">Lucide</dt><dd class="adt">ISC</dd></div>
          <div class="arow"><dt class="anm">Simple Icons</dt><dd class="adt">CC0-1.0</dd></div>
          <div class="arow"><dt class="anm">IBM Plex</dt><dd class="adt">OFL-1.1</dd></div>
        </dl>

        <p class="glab two">{$t('about.group.credits')}</p>
        <div class="box">
          <div class="prow">
            <span class="pattr">{$t('about.attribution')}</span>
            <span class="pdisc">{$t('about.disclosure')}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .ws {
    flex: 1;
    min-height: 0;
    display: flex;
    background: var(--surface);
    position: relative;      /* containing block for ConfirmRemove */
    overflow: hidden;
  }

  /*
    §3.4.5, §3.4.12 — the Content Area is a column of a PINNED heading and a
    scrolling region, not a single scroller.

    It used to carry `overflow-y: auto` itself, which meant every section's
    heading scrolled away with its content — and the heading is where the Add
    action lives, precisely so it stays reachable with a dozen engines
    installed. The scroll now belongs to `.scroll` beneath the heading.
  */
  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Pinned. The three object sections define the same geometry locally. */
  .chead {
    flex: none;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 22px;
    border-bottom: 1px solid var(--rule);
  }
  h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; color: var(--ink); }

  /* The only scrolling region. Every section, About included. */
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 18px 22px 22px;
  }

  /* §3.4.6, §3.4.7, §3.4.11 — boxed groups, label above the box. */
  .glab {
    font: 10px/1 var(--mono);
    letter-spacing: .11em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 7px;
    padding-left: 2px;
  }
  .glab.two { margin-top: 20px; }

  .box {
    border: 1px solid var(--rule-strong);
    border-radius: 9px;
    background: var(--surface);
    overflow: hidden;
  }

  /* §3.4.6 — Library location: a reported value with its action beside it. */
  .crow {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 14px;
  }
  .ctext { flex: 1; min-width: 0; }
  .clbl { font-size: 13.5px; font-weight: 600; color: var(--ink); display: block; }
  .cval {
    flex: none;
    font: 11.5px var(--mono);
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 40%;
  }
  .cbtn {
    flex: none;
    height: 28px;
    padding: 0 11px;
    border: 1px solid var(--rule-strong);
    border-radius: 5px;
    background: var(--surface);
    font: 600 12px var(--sans);
    color: var(--ink);
    white-space: nowrap;
  }
  .cbtn:hover { background: var(--chrome); }

  /*
    §3.4.11 — the About row. The object row with its leading slot and trailing
    controls removed: label left at 13.5/600, value right at 12px muted.
  */
  dl { margin: 0; }
  .arow {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 14px;
  }
  .arow + .arow { border-top: 1px solid var(--rule); }
  .anm { font-size: 13.5px; font-weight: 600; color: var(--ink); flex: none; white-space: nowrap; }
  dd.adt { margin: 0; }
  .adt {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--muted);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /*
    The credits row — the only row in Settings with no right-hand column. An
    attribution is a sentence, not a value, so it takes the full width and is
    allowed to flow; no reading-width cap, which would wrap it early.
  */
  .prow {
    min-height: 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: 11px 14px;
  }
  .pattr { font-size: 13.5px; font-weight: 600; color: var(--ink); }
  .pdisc { font-size: 12px; color: var(--muted); }

  .scroll.flash .box { outline: 2px solid var(--focus); outline-offset: 2px; }
</style>
