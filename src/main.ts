import { mount } from 'svelte';
import App from './App.svelte';
import { themeStore } from '$lib/stores/theme.svelte';

/* Restore the persisted theme synchronously BEFORE the first paint —
 * density/font-size/palette land with the initial frame, so there is
 * no flash or layout shift. init() (async, in App onMount) then takes
 * over with OS sync and the authoritative appDataDir copy. */
themeStore.preload();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
