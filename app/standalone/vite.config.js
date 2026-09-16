import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

/* The displayed version, from package.json — the same define the main build and
   the tests get (see ../vitest.config.js). Without it Settings › About throws
   and the Settings workspace does not render in the standalone file. */
const { version } = JSON.parse(readFileSync(r('../package.json'), 'utf8'));

export default {
  root: r('.'),
  plugins: [svelte({ configFile: false }), viteSingleFile()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: [
      { find: '$lib', replacement: r('../src/lib') },
      { find: '$app/environment', replacement: r('./stub-environment.js') }
    ]
  },
  build: { outDir: r('../standalone-dist'), emptyOutDir: true, assetsInlineLimit: 100000000 }
};
