/* Theme store — Svelte 5 Runes class pattern.
 *
 * Applies a theme by writing its tokens as inline CSS custom
 * properties on <html>, which override the fallback values compiled
 * from app.css. The persisted selection ("system" or a theme id)
 * lives in localStorage under `twister_theme`; "system" re-detects
 * the desktop environment on every launch.
 *
 * On top of the theme tokens sits an optional accent override: when
 * `followSystemAccent` is on and the XDG portal reports an accent
 * color, --color-primary/--color-primary-content are replaced so the
 * app re-tints to match the desktop, live. */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  detectDesktopEnvironment,
  watchSystemAccent,
} from '$lib/ipc/commands';
import {
  DEFAULT_THEME_ID,
  themes,
  type ThemeId,
  type ThemeSelection,
} from '$lib/themes';
import {
  accentContentColor,
  accentToCss,
  type AccentRgb,
} from '$lib/themes/accent';
import { themeForDesktop } from '$lib/themes/detect';

const STORAGE_KEY = 'twister_theme';
const ACCENT_STORAGE_KEY = 'twister_follow_system_accent';

class ThemeStore {
  /** Persisted user choice. */
  selection = $state<ThemeSelection>('system');
  /** Theme actually applied (resolved from detection when on "system"). */
  resolvedId = $state<ThemeId>(DEFAULT_THEME_ID);
  /** Last detection result, for the picker's "Detected: …" subtext. */
  detected = $state<ThemeId | null>(null);
  /** Preference: re-tint the active theme with the desktop accent. */
  followSystemAccent = $state(true);
  /** Last accent from the portal; null = unavailable (stock fallback). */
  systemAccent = $state<AccentRgb | null>(null);

  private unlistenAccent: UnlistenFn | null = null;

  async init(): Promise<void> {
    document.documentElement.setAttribute('data-surface-mode', 'opaque');
    const stored = localStorage.getItem(STORAGE_KEY);
    this.selection =
      stored === 'system' || (stored !== null && stored in themes)
        ? stored
        : 'system';
    this.followSystemAccent =
      localStorage.getItem(ACCENT_STORAGE_KEY) !== 'false';

    try {
      /* Listener first, then start the watcher — never miss an early emit. */
      if (!this.unlistenAccent) {
        this.unlistenAccent = await listen<AccentRgb | null>(
          'system:accent',
          (event) => {
            this.systemAccent = event.payload;
            this.applyById(this.resolvedId);
          },
        );
      }
      this.systemAccent = await watchSystemAccent();
    } catch {
      /* browser dev — no Tauri IPC; stock accent */
      this.systemAccent = null;
    }

    await this.apply();
  }

  async setTheme(selection: ThemeSelection): Promise<void> {
    this.selection = selection;
    localStorage.setItem(STORAGE_KEY, selection);
    await this.apply();
  }

  setFollowSystemAccent(value: boolean): void {
    this.followSystemAccent = value;
    localStorage.setItem(ACCENT_STORAGE_KEY, String(value));
    this.applyById(this.resolvedId);
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
    /* Accent override last, so it wins over the stock tokens. Because
     * the loop above rewrites every token, re-running this method is
     * also the revert path when the override turns off. */
    this.applyAccent();
  }

  private applyAccent(): void {
    if (!this.followSystemAccent || this.systemAccent === null) return;
    const css = accentToCss(this.systemAccent);
    if (css === null) return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', css);
    root.style.setProperty(
      '--color-primary-content',
      accentContentColor(this.systemAccent),
    );
  }
}

export const themeStore = new ThemeStore();
