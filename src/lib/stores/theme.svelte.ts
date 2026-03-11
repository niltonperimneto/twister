/* Theme / surface-mode store — Svelte 5 Runes class pattern.
 *
 * Detects the Linux desktop environment via Tauri IPC and exposes a
 * reactive `surfaceMode` field ('glass' | 'opaque').  KDE Plasma gets
 * glass; everything else stays opaque. */

import { detectSurfaceMode } from '$lib/ipc/commands';

export type SurfaceMode = 'glass' | 'opaque';

class ThemeStore {
  surfaceMode: SurfaceMode = $state('opaque');
  readonly isGlass: boolean = $derived(this.surfaceMode === 'glass');

  async init(): Promise<void> {
    try {
      const mode = await detectSurfaceMode();
      this.surfaceMode = mode === 'glass' ? 'glass' : 'opaque';
    } catch {
      this.surfaceMode = 'opaque';
    }
    document.documentElement.setAttribute('data-surface-mode', this.surfaceMode);
  }
}

export const themeStore = new ThemeStore();
