<script>
  /**
   * Databases — §3.4.8. Rows, not cards.
   *
   * Accepted 4 Sep (wireframes/settings-databases.html, Rev D). This section
   * uses the row pattern: Installed and Available in boxed groups, 44px rows,
   * an expander, and the Install button doubling as the progress indicator.
   *
   * Engines and Subscriptions still use the card pattern. That inconsistency
   * is deliberate and temporary — the Engines row exploration is below G1, and
   * this section went first because it was the one approved.
   *
   * Add database: create new — `working/wireframes/settings-databases-add.html`
   * (Rev G, G1 20 Sep 2026), DB‑04/DB‑05/DB‑03r. A freshly-added row is a
   * *draft* (`db.draft`, `stores/settings.js`'s `addObject('databases')`):
   * its expander swaps the ordinary Name/Version/Remove fields for Name +
   * Filename + a directory-only Location and a Cancel/Create pair, and
   * nothing is written to disk or `config.db` until `createDatabase()`
   * (Create) actually runs — this is a deliberate, accepted exception to
   * §3.4.1's auto-apply, not a lapse into it: writing a file is heavier than
   * committing a field, so an explicit step is correct here. Cancel discards
   * the draft exactly like removing any other row (`cancelDatabaseDraft()`).
   */
  import { get } from 'svelte/store';
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { DatabaseIcon, SectionExpand, SubmenuArrow, AddGames } from '$lib/icons.js';
  import {
    objects, availableDatabases, installDatabase, renameDatabase,
    setDatabaseEnabled, removeObject, addObject, createDatabase, cancelDatabaseDraft
  } from '$lib/stores/settings.js';
  import {
    installedDetail, availableDetail, downloadingDetail,
    deriveFilename, validateDraftDatabase, basename
  } from '$lib/settings/databases.js';
  import { isTauri, defaultLibrariesDirDisplay } from '$lib/data/session.js';

  let { heading } = $props();

  /** Expanded rows are momentary, per row, and not persisted. */
  let expanded = $state(null);
  let nameError = $state(null);

  /*
    A draft's own local editing state — not committed to `objects` until
    Create. Single set rather than one per row: only one row can be expanded
    at a time (`expanded` is a single id), so only one draft is ever being
    edited at once. `draftServerError` is distinct from the live
    `draftValidation()` check below: it holds the one thing that check can't
    see client-side — a Filename collision `createDatabase()` only finds by
    actually listing the Libraries directory on disk (DB‑05's note) — and is
    cleared as soon as either field changes again.
  */
  let draftName = $state('');
  let draftFilename = $state('');
  let filenameDetached = $state(false);
  let creating = $state(false);
  let librariesDir = $state('');
  let draftServerError = $state(null);

  const installed = $derived(
    [...($objects.databases ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  );

  /*
    Re-seed the draft fields whenever a DIFFERENT row becomes expanded. Reads
    `objects` with the imported `get()` rather than the `$objects` auto-
    subscription, which is a one-shot read and creates no reactive dependency
    of its own — so this effect depends only on `expanded`, and typing into
    the draft's own fields afterward isn't stomped by an unrelated store
    update elsewhere in Settings.
  */
  $effect(() => {
    const id = expanded;
    const db = (get(objects).databases ?? []).find((d) => d.id === id);
    if (db?.draft) {
      draftName = db.name;
      draftFilename = deriveFilename(db.name);
      filenameDetached = false;
    }
  });

  $effect(() => {
    if (isTauri()) {
      defaultLibrariesDirDisplay().then((v) => { librariesDir = v; }).catch(() => {});
    }
  });

  function commitName(db, value) {
    nameError = renameDatabase(db.id, value);
  }

  function onDraftNameInput(value) {
    draftName = value;
    if (!filenameDetached) draftFilename = deriveFilename(value);
    draftServerError = null;
  }

  function onDraftFilenameInput(value) {
    draftFilename = value;
    filenameDetached = true;
    draftServerError = null;
  }

  /**
   * The live, client-side half of DB‑05's shared check — everything
   * `validateDraftDatabase` can decide from what's already loaded (other
   * rows' names and, for a real row, its Location's filename). Desktop's
   * extra "actual directory listing on disk" check only happens inside
   * `createDatabase()` at Create time (an IPC round trip per keystroke isn't
   * worth it for a check that registered-name collisions already catch in
   * the overwhelming majority of cases) — its result, if any, surfaces as
   * `draftServerError` instead.
   */
  function draftValidation(id) {
    const others = installed.filter((d) => d.id !== id && !d.draft);
    const existingNames = others.map((d) => d.name);
    const existingFilenames = others.map((d) => d.location && basename(d.location)).filter(Boolean);
    return validateDraftDatabase({
      name: draftName, filename: draftFilename, existingNames, existingFilenames
    });
  }

  async function confirmCreate(id) {
    if (creating) return;
    creating = true;
    try {
      const error = await createDatabase(id, { name: draftName, filename: draftFilename });
      if (error) {
        draftServerError = error;
        return;
      }
      draftServerError = null;
      expanded = null;
    } catch (err) {
      // No drawn failure state for this (out of scope — DB‑04/DB‑05 draw
      // only the three validation states). Logged and left as a draft the
      // user can retry, rather than losing what they typed.
      console.error('Plyvio: failed to create the database', err);
    } finally {
      creating = false;
    }
  }

  function cancelDraft(id) {
    if (expanded === id) expanded = null;
    draftServerError = null;
    cancelDatabaseDraft(id);
  }
</script>

<div class="chead">
  <h2>{heading}</h2>
  <button class="add" type="button" onclick={() => (expanded = addObject('databases'))}>
    <Icon icon={AddGames} size={13} />{$t('settings.addDatabase')}
  </button>
</div>

<div class="scroll">
  <p class="glab">{$t('settings.installed')}</p>
  <div class="box">
    {#each installed as db (db.id)}
      <div class="r" class:hov={expanded === db.id}>
        <span class="ic"><Icon icon={DatabaseIcon} size={18} /></span>
        <span class="nm">{db.name}</span>
        <!--
          A real Library (config.db's libraries table) has no games/players/
          bytes column — installedDetail() is only meaningful for a row that
          has them, which today means a mock catalogue install
          (installDatabase(), still simulated). A real row's id is an
          integer; a mock row's is a generated string (nextId('db')).
        -->
        <span class="dt">{db.games != null ? installedDetail(db) : ''}</span>
        <button
          class="tg" class:on={db.enabled !== false} type="button"
          role="switch" aria-checked={db.enabled !== false}
          aria-label={$t('settings.enableDatabase', { name: db.name })}
          onclick={() => setDatabaseEnabled(db.id, db.enabled === false)}
        ></button>
        <button
          class="cv" type="button"
          aria-expanded={expanded === db.id}
          aria-label={$t('settings.databaseSettings', { name: db.name })}
          onclick={() => (expanded = expanded === db.id ? null : db.id)}
        ><Icon icon={expanded === db.id ? SectionExpand : SubmenuArrow} size={15} /></button>
      </div>

      {#if expanded === db.id && db.draft}
        <!-- DB‑04/DB‑05 — the draft row: Name + Filename, same width, Location
             (directory only) and the shared Cancel/Create footer. -->
        {@const error = draftServerError ?? draftValidation(db.id)}
        <div class="exp">
          <div class="er">
            <span class="k"><label for="dbname-{db.id}">{$t('field.name')}</label></span>
            <input
              id="dbname-{db.id}" class="inp efield" class:err={error?.field === 'name'}
              type="text" value={draftName}
              oninput={(e) => onDraftNameInput(e.currentTarget.value)}
            />
          </div>
          <div class="er">
            <span class="k"><label for="dbfilename-{db.id}">{$t('field.filename')}</label></span>
            <input
              id="dbfilename-{db.id}" class="inp efield" class:err={error?.field === 'filename'}
              type="text" value={draftFilename}
              oninput={(e) => onDraftFilenameInput(e.currentTarget.value)}
            />
          </div>
          <div class="er"><span class="k">{$t('settings.databaseLocation')}</span>
            <span class="v">{isTauri() ? librariesDir : $t('settings.storedInBrowser')}</span></div>
          <div class="actions">
            {#if error}
              <span class="formmsg" role="alert">{$t(error.key, error.params)}</span>
            {/if}
            <button class="b" type="button" onclick={() => cancelDraft(db.id)}>
              {$t('settings.cancel')}
            </button>
            <button
              class="b pri" type="button" disabled={!!error || creating}
              onclick={() => confirmCreate(db.id)}
            >{$t('settings.create')}</button>
          </div>
        </div>
      {:else if expanded === db.id}
        <!-- DB‑03r — a real database: Name, Version, Location. No Filename
             field (Location already carries it) and no draft actions. -->
        <div class="exp">
          <div class="er">
            <span class="k"><label for="dbname-{db.id}">{$t('field.name')}</label></span>
            <input
              id="dbname-{db.id}" class="inp" type="text" value={db.name}
              onblur={(e) => commitName(db, e.currentTarget.value)}
            />
          </div>
          {#if nameError}<p class="err">{$t(nameError)}</p>{/if}
          <div class="er"><span class="k">{$t('field.version')}</span>
            <span class="v">{db.version ?? '—'}</span></div>
          <!--
            `location` distinguishes three states by more than truthiness:
            a real path (desktop, set by loadLibraries()/createDatabase()),
            `null` (a PWA-created row — createDatabase() sets it explicitly,
            "Stored in this browser", no path to show), and simply absent
            (every pre-existing seeded/mock row this section drew before this
            feature, which never claimed a Location at all) — that last case
            must keep rendering nothing, exactly as before.
          -->
          {#if db.location}
            <div class="er"><span class="k">{$t('settings.databaseLocation')}</span>
              <span class="v">{db.location}</span></div>
          {:else if db.location === null}
            <div class="er"><span class="k">{$t('settings.databaseLocation')}</span>
              <span class="v">{$t('settings.storedInBrowser')}</span></div>
          {/if}
          {#if typeof db.id !== 'number'}
            <!-- Removing a real Library isn't wired yet (config.db write) — offering
                 the button would look like it worked and then revert on reload. -->
            <div class="er">
              <span class="k"></span>
              <button class="dan" type="button" onclick={() => removeObject('databases', db.id)}>
                {$t('settings.removeDatabase')}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  {#if $availableDatabases.length}
    <p class="glab two">{$t('settings.available')}</p>
    <div class="box">
      {#each $availableDatabases as db (db.id)}
        {@const p = db.progress}
        <div class="r" class:dim={p?.done}>
          <span class="ic"><Icon icon={DatabaseIcon} size={18} /></span>
          <span class="nm">{db.name}</span>
          <span class="dt">
            {p && !p.done ? downloadingDetail(db, p.pct) : availableDetail(db)}
          </span>
          <button
            class="inst" class:done={p?.done} type="button"
            style={p && !p.done ? `--p:${p.pct}%` : ''}
            disabled={!!p}
            aria-label={$t('settings.installDatabase', { name: db.name })}
            onclick={() => installDatabase(db.id)}
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
    font: 12px var(--sans); font-weight: 600;
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

  /* Boxed grouping — a bounded run, with the label above rather than inside. */
  .box {
    border: 1px solid var(--rule-strong);
    border-radius: 9px;
    background: var(--surface);
    overflow: hidden;
  }
  .box > .r + .r { border-top: 1px solid var(--rule); }
  .box > .exp + .r { border-top: 1px solid var(--rule); }

  /* 44px — Apple HIG 44pt, and WCAG 2.2 SC 2.5.5 satisfied outright. */
  .r {
    height: 44px;
    display: flex; align-items: center; gap: 12px;
    padding: 0 14px;
  }
  .r.hov { background: var(--chrome); }
  .r.dim .nm, .r.dim .dt { color: var(--faint); }
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

  /* The Install button IS the progress indicator — one control, one place. */
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

  /* Expander — settings open beneath the row, they do not navigate. */
  .exp {
    border-top: 1px solid var(--rule);
    background: var(--chrome);
    padding: 4px 14px 8px 44px;
  }
  .er { min-height: 36px; display: flex; align-items: center; gap: 12px; font-size: 12.5px; }
  .er .k { flex: 1; min-width: 0; color: var(--ink); }
  .er .v { font: 11px/1 var(--mono); color: var(--muted); }
  .inp {
    width: 260px; height: 28px; padding: 0 9px;
    background: var(--surface); border: 1px solid var(--rule-strong);
    border-radius: 5px; color: var(--ink); font: 12px var(--sans);
  }
  .err { margin: 0 0 6px; font-size: 11.5px; color: var(--warn); }
  .dan {
    height: 28px; padding: 0 11px;
    border: 1px solid var(--warn); border-radius: 5px;
    background: none; color: var(--warn); font: 600 12px var(--sans);
  }

  /*
    DB‑04/DB‑05 — the draft row's own fields and footer. `.efield` names kept
    from the accepted wireframe (`working/wireframes/settings-databases-add.html`)
    rather than folded into `.inp`, since the red-ring error state is specific
    to this draft form and shouldn't leak onto the ordinary rename input above.
  */
  .efield.err {
    border-color: var(--warn);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--warn) 15%, transparent);
  }
  /*
    One footer row, not two — the message fills the remaining space so it
    sits on the SAME line as Cancel/Create rather than stacked above them,
    per DB‑05's note (status text left, actions right, one row).
  */
  .actions {
    display: flex; align-items: center; justify-content: flex-end; gap: 8px;
    padding-top: 4px; padding-bottom: 4px;
  }
  .formmsg {
    display: flex; align-items: center; gap: 6px;
    flex: 1; min-width: 0;
    font-size: 12px; color: var(--warn);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .b {
    display: inline-flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 11px; flex: none;
    border: 1px solid var(--rule-strong); border-radius: 5px;
    background: var(--surface); color: var(--ink);
    font: 600 12px var(--sans); white-space: nowrap;
  }
  .b.pri { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .b[disabled] { opacity: .4; cursor: not-allowed; }
</style>
