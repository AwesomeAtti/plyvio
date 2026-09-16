<script>
  /**
   * Add Games. §3.2.4.5
   *
   * THE DIALOG READS NOTHING. It collects a source and some options, hands
   * them to the import lane and closes. It never opens a PGN — so there is no
   * game count, no duplicate check and no validity check here, and enablement
   * is PRESENCE rather than validity: at least one file, a non-empty username,
   * non-empty text. Everything that requires looking at a game happens in the
   * lane, and everything that can go wrong is an import error.
   *
   * Three bands, one of which varies:
   *
   *   tabs      File · Online · Paste
   *   source    a file list, a form, or a text area — the only band that differs
   *   options   Add to + Duplicates / Tags / Collections — identical everywhere
   *   commit    Cancel · Add Games — identical everywhere
   *
   * SIZE. A fixed 600 × 400 (wireframe r6). Every tab gets the same box, so
   * switching tabs never moves the commit buttons; the header, tabs, option
   * rows and footer keep their heights, and only the source band gives.
   *
   * ONE SOURCE TYPE PER IMPORT. Many files, or one paste, or one online
   * source; never a mixture. Each tab keeps its own draft so switching loses
   * nothing, and the footer names which one will be imported.
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import {
    FileIcon, PasteIcon, OnlineIcon, AddGames, ClearIcon, DownloadIcon, Checked
  } from '$lib/icons.js';
  import SelectField from './SelectField.svelte';
  import TokenField from './TokenField.svelte';
  import { libraries, activeLibraryId } from '$lib/stores/libraries.js';
  import { collections, tags } from '$lib/stores/library.js';
  import { preferences } from '$lib/stores/settings.js';
  import { startImport } from '$lib/stores/importer.js';
  import { describeSources, formatBytes, SOURCE_LABELS } from '$lib/library/importJob.js';

  let { onclose } = $props();

  /* ---------------- draft state, one per tab (S-1) ------------------- */

  let tab = $state('file');
  let files = $state([]);            // File objects; never read
  let text = $state('');
  let source = $state('chesscom');
  let username = $state('');
  let range = $state('all');
  let keepChecking = $state(false);

  let destination = $state($activeLibraryId);
  let duplicates = $state('skip');
  let chosenTags = $state([]);
  let chosenCollections = $state([]);

  let dropping = $state(false);
  let fileInput = $state(null);
  let dialogEl = $state(null);

  const draft = $derived({ files, text, source, username, range });
  const sources = $derived(describeSources(tab, draft));
  const ready = $derived(sources.length > 0);

  const TABS = [
    { id: 'file',   labelKey: 'add.tab.file',   icon: FileIcon },
    { id: 'online', labelKey: 'add.tab.online', icon: OnlineIcon },
    { id: 'paste',  labelKey: 'add.tab.paste',  icon: PasteIcon }
  ];

  const RANGES = ['all', 'd30', 'm12', 'since'];

  /* §3.2.3.10 — every configured database is listed; one that is indexing or
     disabled is listed but not selectable. */
  const destinations = $derived(
    $libraries.map((l) => ({
      id: l.id,
      label: l.name,
      disabled: !l.selectable,
      detail: l.selectable ? null : $t(`lib.db.${l.status === 'indexed' ? 'disabled' : 'indexing'}`)
    }))
  );

  const sourceOptions = $derived(
    Object.entries(SOURCE_LABELS).map(([id, label]) => ({
      id, label, mark: id === 'chesscom' ? 'cc' : 'li'
    }))
  );

  const duplicateOptions = $derived([
    { id: 'skip',   label: $t('add.dup.skip') },
    { id: 'import', label: $t('add.dup.import') }
  ]);

  const rangeOptions = $derived(RANGES.map((id) => ({ id, label: $t(`add.range.${id}`) })));

  /* Smart Collections are omitted: a game cannot be put into one, and offering
     an action that cannot happen is worse than not offering it (§3.2.3.1). */
  const collectionChoices = $derived($collections.filter((c) => !c.smart));

  /* ---------------- files -------------------------------------------- */

  function addFiles(list) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const known = new Set(files.map((f) => `${f.name}:${f.size}`));
    files = [...files, ...incoming.filter((f) => !known.has(`${f.name}:${f.size}`))];
  }

  function removeFile(i) { files = files.filter((_, n) => n !== i); }

  function onDrop(e) {
    e.preventDefault();
    dropping = false;
    if (e.dataTransfer?.files?.length) { tab = 'file'; addFiles(e.dataTransfer.files); }
  }

  const totalBytes = $derived(files.reduce((n, f) => n + (f.size || 0), 0));

  /* ---------------- commit -------------------------------------------- */

  function submit() {
    if (!ready) return;
    startImport({
      tab,
      draft,
      outcome: $preferences.simulatedImport,
      destination,
      duplicates,
      tags: chosenTags,
      collections: chosenCollections
    });
    onclose?.();
  }

  /* Esc closes, and focus opens inside the dialog — the behaviour
     ConfirmRemove.svelte already established for this application. */
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onclose?.(); }
  }

  $effect(() => {
    const first = dialogEl?.querySelector('.dtab.on');
    first?.focus();
  });
</script>

<div class="scrim" role="presentation"
     ondragover={(e) => { e.preventDefault(); dropping = true; }}
     ondragleave={() => (dropping = false)}
     ondrop={onDrop}>
  <div
    class="dlg"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ag-title"
    tabindex="-1"
    bind:this={dialogEl}
    onkeydown={onKey}
  >
    <!-- header -->
    <div class="head">
      <h2 id="ag-title">{$t('add.title')}</h2>
      <button type="button" class="x" onclick={() => onclose?.()} aria-label={$t('add.close')}>
        <Icon icon={ClearIcon} size={14} />
      </button>
    </div>

    <!--
      Dialog tabs. Flat and underlined, deliberately unlike the shell's raised,
      filled tabs 60px above: a tab there is a DOCUMENT that stays open, a tab
      here is a MODE. They share no visual property but being a row of words.
    -->
    <div class="dtabs" role="tablist" aria-label={$t('add.title')}>
      {#each TABS as tb (tb.id)}
        <button
          type="button"
          class="dtab"
          class:on={tab === tb.id}
          role="tab"
          aria-selected={tab === tb.id}
          onclick={() => (tab = tb.id)}
        >
          <Icon icon={tb.icon} size={13} />
          {$t(tb.labelKey)}
        </button>
      {/each}
    </div>

    <!-- source band — the only one that varies -->
    <div class="src">
      {#if tab === 'file'}
        <div class="chooser">
          <button type="button" class="btn" onclick={() => fileInput?.click()}>
            <Icon icon={AddGames} size={12} />{$t('add.chooseFiles')}
          </button>
          <span class="hint">{$t('add.orDrop')}</span>
          <input
            bind:this={fileInput}
            type="file"
            accept=".pgn,application/x-chess-pgn,text/plain"
            multiple
            class="visually-hidden"
            onchange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
          />
        </div>

        {#if files.length}
          <!--
            No column header and no total row (r6 D-1): a header over a single
            column of file names said nothing, and the footer already carries
            the count and the size. At 164px the list needs the rows.
          -->
          <div class="flist">
            <div class="fscroll">
              {#each files as f, i (f.name + f.size)}
                <div class="fr">
                  <span class="nm"><Icon icon={FileIcon} size={13} /><span>{f.name}</span></span>
                  <span class="v">
                    {formatBytes(f.size)}
                    <button type="button" onclick={() => removeFile(i)}
                            aria-label={$t('add.removeFile', { name: f.name })}>
                      <Icon icon={ClearIcon} size={11} />
                    </button>
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="drop" class:hot={dropping}>
            <Icon icon={DownloadIcon} size={24} />
            <span>{$t('add.dropHere')}</span>
          </div>
        {/if}

      {:else if tab === 'online'}
        <div class="form">
          <div class="line">
            <span class="lbl">{$t('add.source')}</span>
            <SelectField
              value={source}
              options={sourceOptions}
              label={$t('add.source')}
              width={126}
              onselect={(v) => (source = v)}
            />
            <span class="lbl">{$t('add.username')}</span>
            <input
              class="text"
              type="text"
              bind:value={username}
              placeholder={$t('add.usernamePh')}
              aria-label={$t('add.username')}
            />
            <span class="lbl">{$t('add.from')}</span>
            <SelectField
              value={range}
              options={rangeOptions}
              label={$t('add.from')}
              width={112}
              align="right"
              onselect={(v) => (range = v)}
            />
          </div>

          <label class="chk">
            <input type="checkbox" bind:checked={keepChecking} />
            <span class="bx" class:on={keepChecking}>
              {#if keepChecking}<Icon icon={Checked} size={10} />{/if}
            </span>
            {$t('add.keepChecking')}
            <span class="note">{$t('add.keepCheckingNote')}</span>
          </label>
        </div>

      {:else}
        <textarea
          class="ta"
          bind:value={text}
          placeholder={$t('add.pastePh')}
          aria-label={$t('add.tab.paste')}
        ></textarea>
      {/if}
    </div>

    <!--
      Options. Three rows, identical in every tab and every state, each naming
      itself: "In" named nothing, and a user reading it had no reason to know
      the field held Collections rather than a library or a filter.

      Their menus open UPWARD (r6 D-3). The rows are pinned to the bottom of a
      dialog that clips its content, so a downward menu from Tags had 89px
      before the edge at any dialog height and lost its last entries.
    -->
    <div class="opt first">
      <span class="lbl w">{$t('add.addTo')}</span>
      <SelectField
        value={destination}
        options={destinations}
        label={$t('add.addTo')}
        placement="up"
        onselect={(v) => (destination = v)}
      />
      <span class="lbl">{$t('add.duplicates')}</span>
      <SelectField
        value={duplicates}
        options={duplicateOptions}
        label={$t('add.duplicates')}
        width={110}
        align="right"
        placement="up"
        onselect={(v) => (duplicates = v)}
      />
    </div>
    <div class="opt">
      <span class="lbl w">{$t('add.tags')}</span>
      <TokenField
        tokens={chosenTags}
        available={$tags}
        label={$t('add.tags')}
        placement="up"
        placeholder={$t('add.tokenPh')}
        onchange={(v) => (chosenTags = v)}
      />
    </div>
    <div class="opt">
      <span class="lbl w">{$t('add.collections')}</span>
      <TokenField
        tokens={chosenCollections}
        available={collectionChoices}
        label={$t('add.collections')}
        placement="up"
        placeholder={$t('add.tokenPh')}
        onchange={(v) => (chosenCollections = v)}
      />
    </div>

    <!-- commit -->
    <div class="foot">
      {#if tab === 'paste'}
        <button type="button" class="btn" onclick={() => (text = '')}>{$t('add.clear')}</button>
      {/if}
      <span class="cnt">
        {#if sources.length}
          {#if tab === 'file'}
            {files.length === 1 ? $t('add.oneFile') : $t('add.files', { n: files.length })} · {formatBytes(totalBytes)}
          {:else if tab === 'paste'}
            {$t('add.pastedText')}
          {:else}
            {SOURCE_LABELS[source]} · {$t(`add.range.${range}`)}
          {/if}
        {/if}
      </span>
      <button type="button" class="btn" onclick={() => onclose?.()}>{$t('add.cancel')}</button>
      <button type="button" class="btn primary" disabled={!ready} onclick={submit}>
        {$t('add.submit')}
      </button>
    </div>
  </div>
</div>

<style>
  /*
    The scrim, and its precedent. ConfirmRemove.svelte already established a
    modal in this application — a scrim over the workspace, role/aria-modal,
    Escape to dismiss. This follows it rather than inventing a second one, so
    the dialog is not a new material layer: it is the one the app already has,
    used a second time.
  */
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--paper) 72%, transparent);
    padding: 16px;
  }

  .dlg {
    width: 600px;
    max-width: 100%;
    height: 400px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .head {
    flex: none;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 10px 0 14px;
    border-bottom: 1px solid var(--rule);
  }
  .head h2 { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--ink); }
  .x {
    margin-left: auto;
    width: 22px; height: 22px;
    display: grid; place-items: center;
    border-radius: 3px;
    color: var(--muted);
  }
  .x:hover { background: var(--chrome-2); color: var(--ink); }

  .dtabs {
    flex: none;
    height: 34px;
    display: flex;
    align-items: stretch;
    gap: 2px;
    padding: 0 12px;
    border-bottom: 1px solid var(--rule);
  }
  .dtab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    font: 12.5px var(--sans);
    color: var(--muted);
    box-shadow: inset 0 -2px 0 transparent;
    white-space: nowrap;
  }
  .dtab :global(svg) { color: var(--faint); }
  .dtab:hover { color: var(--ink); }
  .dtab.on { color: var(--ink); font-weight: 600; box-shadow: inset 0 -2px 0 var(--ink); }
  .dtab.on :global(svg) { color: var(--ink); }

  /* The source band takes all the remaining height; the options and the
     footer are fixed, so no tab has a void and none needs a second region. */
  .src {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chooser {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
  }
  .hint { font: 11.5px var(--sans); color: var(--muted); }

  .drop {
    flex: 1;
    min-height: 0;
    margin: 0 12px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1.5px dashed var(--rule-strong);
    border-radius: 6px;
    background: var(--chrome);
    color: var(--muted);
    font: 12.5px var(--sans);
  }
  .drop :global(svg) { color: var(--faint); }
  .drop.hot { border-color: var(--focus); background: var(--chrome-2); color: var(--ink); }

  .flist {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--rule);
  }
  .fscroll { flex: 1; min-height: 0; overflow-y: auto; }
  .fr {
    display: grid;
    grid-template-columns: 1fr 130px;
    gap: 10px;
    align-items: center;
    padding: 0 12px;
    height: 32px;
    border-bottom: 1px solid var(--rule);
    font: 12px var(--sans);
  }
  .fr .nm { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .fr .nm :global(svg) { flex: none; color: var(--faint); }
  .fr .nm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fr .v {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    font: 11px var(--mono);
    color: var(--muted);
  }
  .fr .v button {
    width: 16px; height: 16px;
    display: grid; place-items: center;
    border-radius: 3px;
    color: var(--faint);
  }
  .fr .v button:hover { background: var(--chrome-2); color: var(--ink); }

  .form { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 11px 12px; gap: 10px; }
  /* where from · who · how much, on one line */
  .line { display: flex; align-items: center; gap: 9px; }
  .lbl {
    flex: none;
    font: 9px var(--mono);
    letter-spacing: .11em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .lbl.w { width: 76px; }
  .text {
    flex: 1;
    min-width: 0;
    height: 26px;
    padding: 0 8px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    font: 11.5px var(--sans);
    color: var(--ink);
    outline: none;
  }
  .text:focus { border-color: var(--focus); }

  .chk {
    display: flex;
    align-items: center;
    gap: 7px;
    padding-left: 61px;
    font: 11.5px var(--sans);
    color: var(--ink);
    cursor: pointer;
  }
  .chk input { position: absolute; opacity: 0; width: 0; height: 0; }
  .chk .bx {
    width: 13px; height: 13px;
    flex: none;
    display: grid; place-items: center;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--surface);
  }
  .chk .bx.on { background: var(--ink); border-color: var(--ink); color: var(--surface); }
  .chk input:focus-visible + .bx { outline: 2px solid var(--focus); outline-offset: 1px; }
  .chk .note { color: var(--muted); }

  .ta {
    flex: 1;
    min-height: 0;
    margin: 11px 12px;
    padding: 9px 10px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    font: 11px/1.7 var(--mono);
    color: var(--ink);
    resize: none;
    outline: none;
  }
  .ta:focus { border-color: var(--focus); }
  .ta::placeholder { color: var(--faint); font-family: var(--sans); font-size: 12px; }

  .opt {
    flex: none;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    background: var(--chrome);
    border-top: 1px solid var(--rule);
  }
  .opt.first { border-top: 1px solid var(--rule-strong); }
  .opt :global(.sel:first-of-type) { flex: 1; min-width: 0; }

  .foot {
    flex: none;
    height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    background: var(--chrome);
    border-top: 1px solid var(--rule-strong);
  }
  .cnt { margin-left: auto; font: 10px var(--mono); color: var(--muted); }

  .btn {
    flex: none;
    height: 26px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    font: 12px var(--sans);
    color: var(--ink);
    white-space: nowrap;
  }
  .btn:hover { background: var(--chrome-2); }
  .btn.primary { background: var(--ink); border-color: var(--ink); color: var(--surface); font-weight: 600; }
  .btn.primary:hover { filter: brightness(1.15); background: var(--ink); }
  .btn:disabled { opacity: .38; cursor: default; }
  .btn:disabled:hover { background: var(--ink); filter: none; }
</style>
