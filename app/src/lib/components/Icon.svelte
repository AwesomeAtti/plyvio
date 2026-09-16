<script>
  /**
   * Applies this application's icon defaults.
   *
   * Lucide has a context provider for exactly this, but @lucide/svelte 1.41.0
   * does not re-export `setLucideProps` from the package root, so there is no
   * supported way to set them globally. One wrapper is the next best thing:
   * the defaults live in one file rather than being retyped at every call.
   *
   * `absoluteStrokeWidth` keeps the stroke at a true 1.5px whatever the size.
   * Without it Lucide scales the stroke with the icon, so a 13px icon would
   * come out hairline-thin next to an 18px one.
   */
  import { ICON_SIZE, ICON_STROKE } from '$lib/icons.js';

  let {
    icon,
    size = ICON_SIZE,
    stroke = ICON_STROKE,
    label = null,          // set only when the icon is the sole label
    ...rest
  } = $props();

  const Glyph = $derived(icon);
</script>

{#if label}
  <Glyph {size} strokeWidth={stroke} absoluteStrokeWidth role="img" aria-label={label} {...rest} />
{:else}
  <Glyph {size} strokeWidth={stroke} absoluteStrokeWidth aria-hidden="true" {...rest} />
{/if}
