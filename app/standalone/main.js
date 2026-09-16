/* Demo entry — NOT part of the application. It mounts the real AppShell and
   seeds two Game tabs so the shell opens in a working state for review.
   The shipped app (src/routes/+page.svelte) starts with Library only. */
import { mount } from 'svelte';
import '../src/lib/styles/app.css';
import AppShell from '../src/lib/components/AppShell.svelte';
import { openGame, activate } from '../src/lib/stores/tabs.js';

mount(AppShell, { target: document.getElementById('root') });

openGame('Carlsen–Nepomniachtchi, WCh 2021 R6');
openGame('Fischer–Spassky, Reykjavík 1972 G6');
activate('library');
