<script>
  /**
   * Edit game info — GI-M / GI-M2, granted G1.
   *
   * It reuses the Add Games dialog's chrome and its TokenField rather than
   * inventing a second modal and a second way to pick a tag. Tags and
   * Collections are the same two things being chosen in both places, so they
   * are the same control in both places.
   *
   * FIELD ORDER IS THE CARD'S RANKING, NOT PGN'S EXPORT ORDER. The standard's
   * Seven Tag Roster begins Event, Site, Date, Round and reaches the players
   * fifth; this form opens with the players, because the ranking the card is
   * built on says player names outrank everything else and a form that
   * disagreed with the card above it would teach two orders for one game.
   *
   *   White + rating
   *   Black + rating
   *   Result
   *   Event · Site · Date · Round
   *   Favourite · Collections · Tags
   *
   * TWO ENTRY POINTS, ONE DIALOG. The Section's ⋯ menu opens it at the top; the
   * card's chip rail opens it scrolled to Collections and Tags. `focus` says
   * which, because landing at the top when the tags were pressed is not the
   * dialog that was asked for.
   */
  import { untrack } from 'svelte';
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ClearIcon, Favorites } from '$lib/icons.js';
  import TokenField from '$lib/components/library/TokenField.svelte';
  import { tags as libraryTags, collections as libraryCollections } from '$lib/stores/library.js';
  import { parseGameDate } from '$lib/game/info.js';

  let { game = null, info = null, focus = 'top', onclose, onsave } = $props();

  let dialogEl = $state(null);
  let tagsEl = $state(null);

  /*
    A WORKING COPY, SEEDED ONCE. Nothing is written until Save, so Cancel is
    genuinely a cancel rather than an undo of changes already applied — which
    means these fields must NOT track their props. If they did, a save landing
    in the store would flow back and overwrite whatever the user had typed but
    not yet saved.

    `untrack` is what says so. Reading a prop inside `$state(...)` captures the
    initial value either way, but Svelte cannot tell a deliberate snapshot from
    a mistake and warns; this is the same idiom, and the same reason, as
    GameWorkspace.svelte's own seeding of the per-tab game state.

    Safe because the dialog is created fresh each time it opens — the parent
    mounts it under `{#if editing}` — so the props cannot change beneath it.
  */
  const seed = untrack(() => ({
    white: game?.white ?? '',
    whiteElo: game?.white_elo != null ? String(game.white_elo) : '',
    black: game?.black ?? '',
    blackElo: game?.black_elo != null ? String(game.black_elo) : '',
    result: game?.result ?? '*',
    event: game?.event ?? '',
    site: game?.site ?? '',
    date: game?.date ?? '',
    round: game?.round ?? '',
    favorite: !!info?.favorite,
    tags: (info?.chips ?? []).filter((c) => c.kind === 'tag').map((c) => ({ id: c.id, name: c.name })),
    collections: (info?.chips ?? []).filter((c) => c.kind === 'collection').map((c) => ({ id: c.id, name: c.name }))
  }));

  let white = $state(seed.white);
  let whiteElo = $state(seed.whiteElo);
  let black = $state(seed.black);
  let blackElo = $state(seed.blackElo);
  let result = $state(seed.result);
  let event = $state(seed.event);
  let site = $state(seed.site);
  let date = $state(seed.date);
  let round = $state(seed.round);
  let favorite = $state(seed.favorite);

  let chosenTags = $state(seed.tags);
  let chosenCollections = $state(seed.collections);

  /*
    RESULT IS A CLOSED SET. PGN §8.1.1.6 allows exactly four values, so this is
    a choice rather than a text field — there is nothing a user could type here
    that the standard would accept and the buttons would not offer. `*` is the
    fourth and it is a real value, not an empty one: a game that has not been
    decided. Labelled rather than printed bare, because `*` alone says nothing.
  */
  const RESULTS = ['1-0', '1/2-1/2', '0-1', '*'];

  /*
    The date is checked but not reformatted under the user. PGN stores
    `YYYY.MM.DD` and allows `?` for parts that are not known, so a partial value
    is valid input rather than an error — the card already degrades to whatever
    part is known. What is flagged is a value that is neither.
  */
  const dateValid = $derived(
    date.trim() === '' || /^[\d?]{4}\.[\d?]{2}\.[\d?]{2}$/.test(date.trim())
  );
  const dateParsed = $derived(parseGameDate(date));

  const canSave = $derived(dateValid);

  /* Smart collections find their own contents (§3.2.3.1), so a game cannot be
     put in one. Filtered out rather than shown disabled, which would invite the
     user to work out why. */
  const collectionOptions = $derived(($libraryCollections ?? []).filter((c) => !c.smart));

  function save() {
    if (!canSave) return;
    onsave?.({
      white: white.trim(),
      white_elo: whiteElo.trim() === '' ? null : Number(whiteElo),
      black: black.trim(),
      black_elo: blackElo.trim() === '' ? null : Number(blackElo),
      result,
      event: event.trim(),
      site: site.trim(),
      date: date.trim(),
      round: round.trim(),
      favorite,
      tags: chosenTags,
      collections: chosenCollections
    });
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onclose?.(); }
  }

  /* Opened from the chip rail, the dialog arrives showing the thing that was
     pressed. Opened from the menu, it arrives at the top. */
  $effect(() => {
    if (focus === 'tags') {
      tagsEl?.scrollIntoView({ block: 'center' });
      tagsEl?.querySelector('input')?.focus();
    } else {
      dialogEl?.querySelector('input')?.focus();
    }
  });
</script>

<div class="scrim" role="presentation">
  <div
    class="dlg"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gi-title"
    tabindex="-1"
    bind:this={dialogEl}
    onkeydown={onKey}
  >
    <div class="head">
      <h2 id="gi-title">{$t('game.edit.title')}</h2>
      <button type="button" class="x" onclick={() => onclose?.()} aria-label={$t('game.edit.close')}>
        <Icon icon={ClearIcon} size={14} />
      </button>
    </div>

    <div class="body">
      <!-- Players first — §1's ranking, not the PGN roster's export order. -->
      <div class="grp">{$t('game.edit.players')}</div>

      <div class="line">
        <label class="lbl" for="gi-white">{$t('game.edit.white')}</label>
        <input id="gi-white" type="text" bind:value={white} />
        <input
          class="elo"
          type="text"
          inputmode="numeric"
          bind:value={whiteElo}
          aria-label={$t('game.edit.whiteElo')}
          placeholder={$t('game.edit.rating')}
        />
      </div>

      <div class="line">
        <label class="lbl" for="gi-black">{$t('game.edit.black')}</label>
        <input id="gi-black" type="text" bind:value={black} />
        <input
          class="elo"
          type="text"
          inputmode="numeric"
          bind:value={blackElo}
          aria-label={$t('game.edit.blackElo')}
          placeholder={$t('game.edit.rating')}
        />
      </div>

      <div class="line">
        <span class="lbl">{$t('game.edit.result')}</span>
        <div class="seg" role="radiogroup" aria-label={$t('game.edit.result')}>
          {#each RESULTS as r (r)}
            <button
              type="button"
              role="radio"
              aria-checked={result === r}
              class:on={result === r}
              onclick={() => (result = r)}
            >{r === '*' ? $t('game.edit.undecided') : r}</button>
          {/each}
        </div>
      </div>

      <div class="grp">{$t('game.edit.occasion')}</div>

      <div class="line">
        <label class="lbl" for="gi-event">{$t('game.edit.event')}</label>
        <input id="gi-event" type="text" bind:value={event} />
      </div>
      <div class="line">
        <label class="lbl" for="gi-site">{$t('game.edit.site')}</label>
        <input id="gi-site" type="text" bind:value={site} />
      </div>
      <div class="line">
        <label class="lbl" for="gi-date">{$t('game.edit.date')}</label>
        <input
          id="gi-date"
          class:bad={!dateValid}
          type="text"
          bind:value={date}
          placeholder="YYYY.MM.DD"
          aria-invalid={!dateValid}
          aria-describedby="gi-date-note"
        />
        <span class="note" id="gi-date-note" class:bad={!dateValid}>
          {#if !dateValid}
            {$t('game.edit.dateBad')}
          {:else if dateParsed && dateParsed.day === null}
            {$t('game.edit.datePartial')}
          {/if}
        </span>
      </div>
      <div class="line">
        <label class="lbl" for="gi-round">{$t('game.edit.round')}</label>
        <input id="gi-round" type="text" bind:value={round} />
      </div>

      <!-- The user's own marks, last: they are statements about this copy of
           the game rather than about the game, and the form is ordered by what
           the record says before what the user says about it. -->
      <div class="grp" bind:this={tagsEl}>{$t('game.edit.marks')}</div>

      <div class="line">
        <span class="lbl">{$t('game.edit.favourite')}</span>
        <button
          type="button"
          class="fav"
          class:on={favorite}
          role="switch"
          aria-checked={favorite}
          onclick={() => (favorite = !favorite)}
        >
          <Icon icon={Favorites} size={13} />
          {favorite ? $t('game.edit.isFavourite') : $t('game.edit.notFavourite')}
        </button>
      </div>

      <div class="line tall">
        <span class="lbl">{$t('game.edit.collections')}</span>
        <TokenField
          tokens={chosenCollections}
          available={collectionOptions}
          label={$t('game.edit.collections')}
          placeholder={$t('game.edit.addCollection')}
          placement="up"
          onchange={(v) => (chosenCollections = v)}
        />
      </div>

      <div class="line tall">
        <span class="lbl">{$t('game.edit.tags')}</span>
        <TokenField
          tokens={chosenTags}
          available={$libraryTags ?? []}
          label={$t('game.edit.tags')}
          placeholder={$t('game.edit.addTag')}
          placement="up"
          onchange={(v) => (chosenTags = v)}
        />
      </div>
    </div>

    <div class="foot">
      <button type="button" class="btn" onclick={() => onclose?.()}>{$t('game.edit.cancel')}</button>
      <button type="button" class="btn primary" disabled={!canSave} onclick={save}>
        {$t('game.edit.save')}
      </button>
    </div>
  </div>
</div>

<style>
  /* The Add Games dialog's chrome, deliberately identical: one modal shape in
     the application, learned once. */
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
    width: 520px;
    max-width: 100%;
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
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 12px 12px 16px;
    border-bottom: 1px solid var(--rule);
  }
  .head h2 { margin: 0; font: 600 14px/1.2 var(--sans); color: var(--ink); }
  .x {
    margin-left: auto;
    width: 26px; height: 26px;
    display: grid; place-items: center;
    border: 1px solid transparent;
    border-radius: 3px;
    background: none;
    color: var(--muted);
    cursor: default;
  }
  .x:hover { background: var(--chrome); color: var(--ink); }
  .x:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .body { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 16px; }

  .grp {
    padding: 14px 0 6px;
    font: 9px/1 var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .line {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .line.tall { align-items: flex-start; }

  .lbl {
    flex: none;
    width: 92px;
    font: 11.5px/1.3 var(--sans);
    color: var(--muted);
    padding-top: 6px;
  }
  .line:not(.tall) .lbl { padding-top: 0; }

  input[type="text"] {
    flex: 1;
    min-width: 0;
    height: 26px;
    padding: 0 8px;
    font: 12px/1 var(--sans);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  input:focus-visible { outline: 2px solid var(--focus); outline-offset: -1px; }

  /* A rating is tabular and short; it gets a column rather than the row. */
  .elo {
    flex: none !important;
    width: 74px;
    font-family: var(--mono) !important;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input.bad { border-color: var(--danger, #a33); }

  .note {
    flex: none;
    font: 10px/1.3 var(--mono);
    color: var(--muted);
    max-width: 150px;
  }
  .note.bad { color: var(--danger, #a33); }

  /* Result: four buttons, because the standard allows four values. */
  .seg { display: inline-flex; border: 1px solid var(--rule-strong); border-radius: 4px; overflow: hidden; }
  .seg button {
    height: 26px;
    padding: 0 10px;
    border: 0;
    border-right: 1px solid var(--rule-strong);
    background: var(--surface);
    font: 11.5px/1 var(--mono);
    color: var(--muted);
    cursor: default;
  }
  .seg button:last-child { border-right: 0; font-family: var(--sans); }
  .seg button:hover { background: var(--chrome); }
  .seg button.on { background: var(--ink); color: var(--surface); }
  .seg button:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .fav {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    background: var(--surface);
    font: 11.5px/1 var(--sans);
    color: var(--muted);
    cursor: default;
  }
  .fav:hover { background: var(--chrome); }
  .fav.on { color: var(--accent, #8a5a1c); border-color: var(--accent, #8a5a1c); }
  .fav.on :global(svg) { fill: currentColor; }
  .fav:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .foot {
    flex: none;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--rule);
    background: var(--chrome);
  }
  .btn {
    height: 28px;
    padding: 0 14px;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    background: var(--surface);
    font: 12px/1 var(--sans);
    color: var(--ink);
    cursor: default;
  }
  .btn:hover:not(:disabled) { background: var(--chrome-2, var(--chrome)); }
  .btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  .btn.primary { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .btn.primary:hover:not(:disabled) { opacity: .9; }
  .btn:disabled { opacity: .45; }
</style>
