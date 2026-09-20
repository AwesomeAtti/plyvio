<script>
  /**
   * Subscriptions — SU‑A, accepted 4 Sep. Not yet in the specification.
   *
   * The row pattern of §3.4.8.1 and §3.4.8.2 with ONE boxed group. The
   * Installed / Available split does not transfer: there is no catalogue to
   * download from, so a second group would have nothing to hold.
   *
   * Two things are particular to this section:
   *
   *   1. The leading icon is the SOURCE'S OWN BRAND MARK (§3.2.3.3), not a
   *      generic feed glyph and not the engine or database icon. It is also
   *      what a group heading would otherwise say, which is why one group
   *      suffices.
   *   2. The status slot is LIVE. Engines and databases are static once
   *      installed; a subscription changes state while the section is open.
   *      Its priority — error ▸ syncing ▸ new games ▸ nothing — is §3.2.3.3's,
   *      so a subscription cannot read differently here and in the Library.
   *
   * There is no version field: a subscription has no version.
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { SectionExpand, SubmenuArrow, AddGames, Syncing, SyncError } from '$lib/icons.js';
  import ChessComMark from '$lib/components/icons/ChessComMark.svelte';
  import LichessMark from '$lib/components/icons/LichessMark.svelte';
  import {
    objects, renameSubscription, setSubscriptionInterval, setSubscriptionEnabled,
    syncSubscription, removeObject, addObject
  } from '$lib/stores/settings.js';
  import { statusOf, detailOf, INTERVALS, SOURCES } from '$lib/settings/subscriptions.js';

  let { heading } = $props();

  let expanded = $state(null);
  let nameError = $state(null);

  const MARK = { chesscom: ChessComMark, lichess: LichessMark };

  const subs = $derived(
    [...($objects.subscriptions ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  );

  const label = (s) => `${SOURCES[s.source]?.label ?? ''} — ${s.name}`;
</script>

<div class="chead">
  <h2>{heading}</h2>
  <button class="add" type="button" onclick={() => (expanded = addObject('subscriptions'))}>
    <Icon icon={AddGames} size={13} />{$t('settings.addSubscription')}
  </button>
</div>

<div class="scroll">
  <p class="glab">{$t('settings.subscriptions')}</p>
  <div class="box">
    {#each subs as s (s.id)}
      {@const st = statusOf(s)}
      {@const Mark = MARK[s.source]}
      <div class="r" class:hov={expanded === s.id}>
        <!-- §3.2.3.3 — the source's own mark, inheriting the row's colour -->
        <span class="mk">{#if Mark}<Mark size={16} />{/if}</span>
        <span class="nm">{s.name}</span>
        <span class="dt">{detailOf(s, $t)}</span>
        {#if st}
          <span class="st {st.kind}">
            {#if st.kind === 'error'}<Icon icon={SyncError} size={12} />{$t(st.key)}
            {:else if st.kind === 'syncing'}<Icon icon={Syncing} size={12} />{$t(st.key)}
            {:else}{$t(st.key, { n: st.n })}{/if}
          </span>
        {/if}
        <!--
          A real subscription (config.db's subscriptions table, integer id)
          is read-only this pass — the Edit View's single `url` field doesn't
          match the schema (source_type + source_identifier + a destination
          Library), so editing it is deferred rather than half-wired.
          Disabled rather than hidden, so the toggle still reports the real
          `enabled` state.
        -->
        <button
          class="tg" class:on={s.enabled !== false} type="button"
          role="switch" aria-checked={s.enabled !== false}
          aria-label={$t('settings.enableSubscription', { name: label(s) })}
          disabled={typeof s.id === 'number'}
          onclick={() => setSubscriptionEnabled(s.id, s.enabled === false)}
        ></button>
        {#if typeof s.id !== 'number'}
          <button
            class="cv" type="button"
            aria-expanded={expanded === s.id}
            aria-label={$t('settings.subscriptionSettings', { name: label(s) })}
            onclick={() => (expanded = expanded === s.id ? null : s.id)}
          ><Icon icon={expanded === s.id ? SectionExpand : SubmenuArrow} size={15} /></button>
        {:else}
          <span class="cv" aria-hidden="true"></span>
        {/if}
      </div>

      {#if expanded === s.id && typeof s.id !== 'number'}
        <div class="exp">
          <div class="er">
            <span class="k"><label for="subname-{s.id}">{$t('field.name')}</label></span>
            <input
              id="subname-{s.id}" class="inp" type="text" value={s.name}
              onblur={(e) => (nameError = renameSubscription(s.id, e.currentTarget.value))}
            />
          </div>
          {#if nameError}<p class="err">{$t(nameError)}</p>{/if}
          <div class="er"><span class="k">{$t('field.source')}</span>
            <span class="v">{SOURCES[s.source]?.label ?? '—'}</span></div>
          <div class="er">
            <span class="k"><label for="subint-{s.id}">{$t('field.interval')}</label></span>
            <select
              id="subint-{s.id}" class="sel" value={s.interval}
              onchange={(e) => setSubscriptionInterval(s.id, e.currentTarget.value)}
            >
              {#each INTERVALS as o}<option value={o}>{o}</option>{/each}
            </select>
          </div>
          <div class="er">
            <span class="k"></span>
            <!-- SU‑D rejected: Sync lives here, not on the row -->
            <button
              class="b" type="button" disabled={s.enabled === false || s.state === 'syncing'}
              onclick={() => syncSubscription(s.id)}
            >{$t('settings.syncNow')}</button>
          </div>
          <div class="er">
            <span class="k"></span>
            <button class="dan" type="button" onclick={() => removeObject('subscriptions', s.id)}>
              {$t('settings.removeSubscription')}
            </button>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .chead {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    height: 44px; flex: none;
    border-bottom: 1px solid var(--rule);
    padding: 0 22px;   /* §3.4.5 — the Content Area's side padding */
  }
  h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; color: var(--ink); }
  .add {
    flex: none; display: inline-flex; align-items: center; gap: 6px;
    font: 600 12px var(--sans);
    height: 28px; padding: 0 11px;
    background: var(--ink); color: var(--surface);
    border: 1px solid var(--ink); border-radius: 5px; white-space: nowrap;
  }

  /*
    §3.4.12 — THE scrolling region. The Section Heading above is `flex: none`
    and stays put; only this moves. Every section scrolls, About included.

    This used to be `.content` in SettingsWorkspace, which wrapped the heading
    too, so the heading and its Add button scrolled away with the list —
    defeating the reason the Add action sits in the heading rather than at the
    top of the first group.
  */
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 18px 22px 22px;
  }

  .glab {
    font: 10px/1 var(--mono); letter-spacing: .11em; text-transform: uppercase;
    color: var(--muted); margin: 0 0 7px; padding-left: 2px;
  }

  .box {
    border: 1px solid var(--rule-strong);
    border-radius: 9px;
    background: var(--surface);
    overflow: hidden;
  }
  .box > .r + .r { border-top: 1px solid var(--rule); }
  .box > .exp + .r { border-top: 1px solid var(--rule); }

  .r { height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 14px; }
  .r.hov { background: var(--chrome); }
  /*
    §7.4 — the leading slot is 18px in every object section so the name column
    starts at the same 44px offset throughout (14 padding + 18 slot + 12 gap),
    which is what .exp's padding-left already assumed. Undeclared, the slot took
    its width from its content and Subscriptions' 16px brand mark started its
    names at 42px.

    The slot is not the drawing. A Lucide glyph is drawn at 18 and a Simple
    Icons brand mark at 16, and they render the same visual height: Lucide
    reserves a margin inside its 24-unit grid (~92% of nominal), Simple Icons
    take the full grid (100%).
  */
  /* The mark inherits the row's colour, so it darkens with the text. */
  .r .mk {
    width: 18px; height: 18px; flex: none;
    display: grid; place-items: center;
    color: var(--ink);
  }
  .r .nm { font-size: 13.5px; font-weight: 600; flex: none; white-space: nowrap; }
  .r .dt {
    flex: 1; min-width: 0; font-size: 12px; color: var(--muted);
    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* Live status — §3.2.3.3's priority, never colour alone (§9.3). */
  .st {
    flex: none; display: inline-flex; align-items: center; gap: 4px;
    font: 11px/1 var(--mono);
  }
  .st.error { color: var(--warn); }
  .st.syncing { color: var(--muted); }
  .st.new { color: var(--ok, #2f5d3a); }

  .tg {
    width: 34px; height: 20px; flex: none;
    border: 0; border-radius: 10px; background: var(--fill-3, #cfcfc9);
    position: relative; padding: 0;
  }
  .tg::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.3);
    transition: left .12s ease;
  }
  .tg.on { background: var(--ok, #2f5d3a); }
  .tg.on::after { left: 16px; }
  .tg:focus-visible, .cv:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

  .cv {
    width: 20px; height: 20px; flex: none;
    display: grid; place-items: center;
    border: 0; background: none; color: var(--faint); padding: 0;
  }
  .cv:hover { color: var(--ink); }

  .exp {
    border-top: 1px solid var(--rule);
    background: var(--chrome);
    padding: 4px 14px 8px 44px;
  }
  .er { min-height: 36px; display: flex; align-items: center; gap: 12px; font-size: 12.5px; }
  .er .k { flex: 1; min-width: 0; color: var(--ink); }
  .er .v { font: 11px/1 var(--mono); color: var(--muted); }
  .inp, .sel {
    width: 260px; height: 28px; padding: 0 9px;
    background: var(--surface); border: 1px solid var(--rule-strong);
    border-radius: 5px; color: var(--ink); font: 12px var(--sans);
  }
  .sel { width: 140px; }
  .err { margin: 0 0 6px; font-size: 11.5px; color: var(--warn); }
  .b {
    height: 28px; padding: 0 11px;
    border: 1px solid var(--rule-strong); border-radius: 5px;
    background: var(--surface); color: var(--ink); font: 600 12px var(--sans);
  }
  .b[disabled] { color: var(--faint); border-color: var(--rule); }
  .dan {
    height: 28px; padding: 0 11px;
    border: 1px solid var(--warn); border-radius: 5px;
    background: none; color: var(--warn); font: 600 12px var(--sans);
  }
</style>
