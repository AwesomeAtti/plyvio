<script>
  /**
   * Engines — §3.4.8.2. Rows, on the pattern §3.4.8.1 established.
   *
   * Accepted 4 Sep (wireframes/settings-engines.html). Two differences from
   * Databases, and both come from an engine being configurable where a
   * database is not:
   *
   *   1. The version sits BESIDE THE NAME, not in the expander. An engine's
   *      version is what distinguishes Stockfish 17.1 from Stockfish 16, and
   *      it is compared while scanning the list. A database carries its
   *      edition inside its name ("Caissabase 2024"), so an inline version
   *      would print the year twice.
   *   2. The expander carries CONTROLS, not just facts — Threads and Hash are
   *      the two options the application itself sets on every engine.
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { EngineIcon, SectionExpand, SubmenuArrow, AddGames } from '$lib/icons.js';
  import {
    objects, availableEngines, installEngine, renameEngine,
    setEngineOption, setEngineEnabled, removeObject, addObject
  } from '$lib/stores/settings.js';
  import {
    installedDetail, availableDetail, downloadingDetail,
    THREAD_OPTIONS, HASH_OPTIONS, formatHash
  } from '$lib/settings/engines.js';

  let { heading } = $props();

  let expanded = $state(null);
  let nameError = $state(null);

  const installed = $derived(
    [...($objects.engines ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  );
</script>

<div class="chead">
  <h2>{heading}</h2>
  <button class="add" type="button" onclick={() => addObject('engines')}>
    <Icon icon={AddGames} size={13} />{$t('settings.addEngine')}
  </button>
</div>

<div class="scroll">
  <p class="glab">{$t('settings.installed')}</p>
  <div class="box">
    {#each installed as e (e.id)}
      <div class="r" class:hov={expanded === e.id}>
        <span class="ic"><Icon icon={EngineIcon} size={18} /></span>
        <span class="nm">{e.name}</span>
        <!-- §3.4.8.2 — the version rides beside the name, unlike a database -->
        <span class="ver">{e.version ?? ''}</span>
        <span class="dt">{installedDetail(e)}</span>
        <button
          class="tg" class:on={e.enabled !== false} type="button"
          role="switch" aria-checked={e.enabled !== false}
          aria-label={$t('settings.enableEngine', { name: e.name })}
          onclick={() => setEngineEnabled(e.id, e.enabled === false)}
        ></button>
        <button
          class="cv" type="button"
          aria-expanded={expanded === e.id}
          aria-label={$t('settings.engineSettings', { name: e.name })}
          onclick={() => (expanded = expanded === e.id ? null : e.id)}
        ><Icon icon={expanded === e.id ? SectionExpand : SubmenuArrow} size={15} /></button>
      </div>

      {#if expanded === e.id}
        <div class="exp">
          <div class="er">
            <span class="k"><label for="engname-{e.id}">{$t('field.name')}</label></span>
            <input
              id="engname-{e.id}" class="inp" type="text" value={e.name}
              onblur={(ev) => (nameError = renameEngine(e.id, ev.currentTarget.value))}
            />
          </div>
          {#if nameError}<p class="err">{$t(nameError)}</p>{/if}
          <div class="er"><span class="k">{$t('field.version')}</span>
            <span class="v">{e.version ?? '—'}</span></div>
          <div class="er">
            <span class="k"><label for="engthreads-{e.id}">{$t('field.threads')}</label></span>
            <select
              id="engthreads-{e.id}" class="sel" value={e.threads}
              onchange={(ev) => setEngineOption(e.id, 'threads', Number(ev.currentTarget.value))}
            >
              {#each THREAD_OPTIONS as o}<option value={o}>{o}</option>{/each}
            </select>
          </div>
          <div class="er">
            <span class="k"><label for="enghash-{e.id}">{$t('field.hash')}</label></span>
            <select
              id="enghash-{e.id}" class="sel" value={e.hashMb}
              onchange={(ev) => setEngineOption(e.id, 'hashMb', Number(ev.currentTarget.value))}
            >
              {#each HASH_OPTIONS as o}<option value={o}>{formatHash(o)}</option>{/each}
            </select>
          </div>
          {#if typeof e.id !== 'number'}
            <!-- Removing a real engine isn't wired yet (config.db write) — offering
                 the button would look like it worked and then revert on reload. -->
            <div class="er">
              <span class="k"></span>
              <button class="dan" type="button" onclick={() => removeObject('engines', e.id)}>
                {$t('settings.removeEngine')}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  {#if $availableEngines.length}
    <p class="glab two">{$t('settings.available')}</p>
    <div class="box">
      {#each $availableEngines as e (e.id)}
        {@const p = e.progress}
        <div class="r" class:dim={p?.done}>
          <span class="ic"><Icon icon={EngineIcon} size={18} /></span>
          <span class="nm">{e.name}</span>
          <span class="ver">{e.version}</span>
          <span class="dt">
            {p && !p.done ? downloadingDetail(e, p.pct) : availableDetail(e)}
          </span>
          <button
            class="inst" class:done={p?.done} type="button"
            style={p && !p.done ? `--p:${p.pct}%` : ''}
            disabled={!!p}
            aria-label={$t('settings.installEngine', { name: e.name })}
            onclick={() => installEngine(e.id)}
          >
            {#if p?.done}<span class="tx">{$t('settings.installed')}</span>
            {:else if p}<span class="bar"></span><span class="tx">{p.pct}%</span>
            {:else}<span class="tx">{$t('settings.install')}</span>{/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
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
  .glab.two { margin-top: 20px; }

  .box {
    border: 1px solid var(--rule-strong);
    border-radius: 9px;
    background: var(--surface);
    overflow: hidden;
  }
  .box > .r + .r { border-top: 1px solid var(--rule); }
  .box > .exp + .r { border-top: 1px solid var(--rule); }

  /* 44px — the row standard, shared with Databases and the Settings Sidebar. */
  .r {
    height: 44px;
    display: flex; align-items: center; gap: 12px;
    padding: 0 14px;
  }
  .r.hov { background: var(--chrome); }
  .r.dim .nm, .r.dim .dt, .r.dim .ver { color: var(--faint); }
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
  .r .ic {
    width: 18px; height: 18px; flex: none;
    display: grid; place-items: center;
    color: var(--muted);
  }
  .r .nm { font-size: 13.5px; font-weight: 600; flex: none; white-space: nowrap; }
  /* The version, beside the name — §3.4.8.2. Monospace so releases line up. */
  .r .ver { font: 11px/1 var(--mono); color: var(--faint); flex: none; }
  .r .dt {
    flex: 1; min-width: 0; font-size: 12px; color: var(--muted);
    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

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
  .tg:focus-visible, .cv:focus-visible, .inst:focus-visible {
    outline: 2px solid var(--focus); outline-offset: 1px;
  }

  .cv {
    width: 20px; height: 20px; flex: none;
    display: grid; place-items: center;
    border: 0; background: none; color: var(--faint); padding: 0;
  }
  .cv:hover { color: var(--ink); }

  .inst {
    width: 82px; height: 26px; flex: none;
    border: 1px solid var(--rule-strong); border-radius: 5px;
    background: var(--surface);
    display: grid; place-items: center;
    font: 600 11.5px var(--sans); color: var(--ink);
    position: relative; overflow: hidden;
  }
  .inst .bar { position: absolute; inset: 0; width: var(--p, 0%); background: var(--sel, #dfe7f2); }
  .inst .tx { position: relative; z-index: 1; }
  .inst.done { border-color: var(--ok, #2f5d3a); color: var(--ok, #2f5d3a); }
  .inst[disabled] { cursor: default; }

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
  .dan {
    height: 28px; padding: 0 11px;
    border: 1px solid var(--warn); border-radius: 5px;
    background: none; color: var(--warn); font: 600 12px var(--sans);
  }
</style>
