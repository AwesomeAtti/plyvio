# Offline behaviour (§1.1)

Everything needed to render ships with the app: fonts are system stacks, icons
are inline SVG, locale strings are bundled JS. The service worker precaches the
whole build on install and serves cache-first, falling back to the app shell so
the SPA boots with no network at all. No runtime request reaches a third party.
