/* Theme store — Svelte 5 Runes class pattern.
 *
 * Applies a theme by writing its tokens as inline CSS custom
 * properties on <html>, which override the fallback values compiled
 * from app.css. The persisted selection ("system" or a theme id)
 * lives in localStorage under `twister_theme`; "system" re-detects
 * the desktop environment on every launch. */

import { detectDesktopEnvironment } from '$lib/ipc/commands';
import {
  DEFAULT_THEME_ID,
  themes,
  type ThemeId,
  type ThemeSelection,
} from '$lib/themes';
import { themeForDesktop } from '$lib/themes/detect';

const STORAGE_KEY = 'twister_theme';

class ThemeStore {
  /** Persisted user choice. */
  selection = $state<ThemeSelection>('system');
  /** Theme actually applied (resolved from detection when on "system"). */
  resolvedId = $state<ThemeId>(DEFAULT_THEME_ID);
  /** Last detection result, for the picker's "Detected: …" subtext. */
  detected = $state<ThemeId | null>(null);

  async init(): Promise<void> {
    document.documentElement.setAttribute('data-surface-mode', 'opaque');
    const stored = localStorage.getItem(STORAGE_KEY);
    this.selection =
      stored === 'system' || (stored !== null && stored in themes)
        ? stored
        : 'system';
    await this.apply();
  }

  async setTheme(selection: ThemeSelection): Promise<void> {
    this.selection = selection;
    localStorage.setItem(STORAGE_KEY, selection);
    await this.apply();
  }

  private async apply(): Promise<void> {
    if (this.selection === 'system') {
      let desktop = '';
      try {
        desktop = await detectDesktopEnvironment();
      } catch {
        /* browser dev — no Tauri IPC; fall through to the default */
      }
      this.detected = themeForDesktop(desktop);
      this.applyById(this.detected);
    } else {
      this.applyById(this.selection);
    }
  }

  private applyById(id: ThemeId): void {
    const theme = themes[id] ?? themes[DEFAULT_THEME_ID];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(`--${key}`, value);
    }
    root.setAttribute('data-theme', theme.id);
    this.resolvedId = theme.id;
  }
}

export const themeStore = new ThemeStore();
