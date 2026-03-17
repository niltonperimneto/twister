/* Theme store — Svelte 5 Runes class pattern.
 *
 * Glassmorphism is now rendered entirely within the DOM against an
 * internal mesh-gradient texture, so no compositor detection is needed.
 * The store is retained for future theme preferences (e.g. accent
 * colour, blur intensity dial). */

class ThemeStore {
  async init(): Promise<void> {
    document.documentElement.setAttribute('data-surface-mode', 'opaque');
  }
}

export const themeStore = new ThemeStore();
