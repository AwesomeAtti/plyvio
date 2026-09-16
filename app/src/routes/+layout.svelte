<script>
  import '$lib/styles/fonts.css';
  import '$lib/styles/app.css';
  import '$lib/stores/theme.js';
  import '$lib/stores/i18n.js';

  let { children } = $props();
</script>

{@render children?.()}
