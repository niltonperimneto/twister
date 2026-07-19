/* Theme store — Svelte 5 Runes class pattern.
 *
 * Two layers share one apply path:
 *  - Presets (aurora/breeze/libadwaita/cosmic) — hand-crafted token
 *    maps; "system" re-detects the desktop environment on launch.
 *  - "custom" — tokens compiled at runtime from the 8-axis
 *    ThemeConfig (see $lib/themes/config.ts / compile.ts), with
 *    light/dark resolved from the OS via the Tauri window API when
 *    colorScheme is "system".
 *
 * A single $effect (created in init) recompiles and rewrites the CSS
 * custom properties on <html> whenever any input changes, then
 * persists: synchronously to a localStorage mirror (read back by
 * preload() before first paint — zero layout shift) and debounced to
 * theme-config.json in appDataDir, which is the authoritative copy
 * reconciled during init.
 *
 * On top of the theme tokens sits an optional accent override: when
 * `followSystemAccent` is on and the XDG portal reports an accent
 * color, --color-primary/--color-primary-content are replaced so the
 * app re-tints to match the desktop, live. */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
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
import {
  DEFAULT_THEME_CONFIG,
  validateThemeConfig,
  type ThemeConfig,
} from '$lib/themes/config';
import { compileConfig, compileGlobalTokens } from '$lib/themes/compile';

const MIRROR_KEY = 'twister_theme_state';
const LEGACY_THEME_KEY = 'twister_theme';
const LEGACY_ACCENT_KEY = 'twister_follow_system_accent';
const CONFIG_FILE = 'theme-config.json';
const FS_WRITE_DEBOUNCE_MS = 300;

/** Axes that define the custom palette — touching one while a preset
 *  is active switches the selection to "custom". density/fontSize/
 *  iconTheme stay global (they modify presets too). */
const PALETTE_AXES: readonly (keyof ThemeConfig)[] = [
  'colorScheme',
  'baseColor',
  'highlightColor',
  'roundness',
  'translucency',
];

interface PersistedState {
  selection: ThemeSelection;
  followSystemAccent: boolean;
  config: ThemeConfig;
}

class ThemeStore {
  /** Persisted user choice. */
  selection = $state<ThemeSelection>('system');
  /** Theme actually applied ("custom" or a preset id). */
  resolvedId = $state<ThemeId>(DEFAULT_THEME_ID);
  /** Last detection result, for the picker's "Detected: …" subtext. */
  detected = $state<ThemeId | null>(null);
  /** Preference: re-tint the active theme with the desktop accent. */
  followSystemAccent = $state(true);
  /** Last accent from the portal; null = unavailable (stock fallback). */
  systemAccent = $state<AccentRgb | null>(null);
  /** The 8-axis parametric theme document. */
  config = $state<ThemeConfig>({ ...DEFAULT_THEME_CONFIG });
  /** OS light/dark preference (Tauri window API / matchMedia). */
  systemScheme = $state<'light' | 'dark'>('dark');

  private unlistenAccent: UnlistenFn | null = null;
  private unlistenOsTheme: UnlistenFn | null = null;
  private stopEffects: (() => void) | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private preloaded = false;

  /** light/dark in effect for the custom theme. */
  get resolvedScheme(): 'light' | 'dark' {
    return this.config.colorScheme === 'system'
      ? this.systemScheme
      : this.config.colorScheme;
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                             */
  /* ---------------------------------------------------------------- */

  /** Synchronous pre-paint restore — called from main.ts BEFORE the
   *  app mounts. Reads the localStorage mirror and applies tokens so
   *  the first frame already has the persisted look (no flash, no
   *  layout shift from density/font-size kicking in late). */
  preload(): void {
    if (this.preloaded) return;
    this.preloaded = true;
    document.documentElement.setAttribute('data-surface-mode', 'opaque');

    const state = this.readMirror();
    if (state) {
      this.selection = state.selection;
      this.followSystemAccent = state.followSystemAccent;
      this.config = state.config;
    }
    try {
      this.systemScheme = window.matchMedia('(prefers-color-scheme: light)')
        .matches
        ? 'light'
        : 'dark';
    } catch {
      /* non-browser test environment */
    }
    /* "system" preset selection stays on the app.css fallbacks until
     * async DE detection lands (same as before) — but global
     * density/font tokens still apply pre-paint via applyActive. */
    this.applyActive();
  }

  async init(): Promise<void> {
    this.preload();

    /* OS light/dark: Tauri window API, matchMedia in browser dev. */
    try {
      const win = getCurrentWindow();
      const osTheme = await win.theme();
      if (osTheme === 'light' || osTheme === 'dark') {
        this.systemScheme = osTheme;
      }
      if (!this.unlistenOsTheme) {
        this.unlistenOsTheme = await win.onThemeChanged(({ payload }) => {
          this.systemScheme = payload;
        });
      }
    } catch {
      /* browser dev — no Tauri IPC; track matchMedia instead */
      try {
        const query = window.matchMedia('(prefers-color-scheme: light)');
        query.addEventListener('change', (e) => {
          this.systemScheme = e.matches ? 'light' : 'dark';
        });
      } catch {
        /* non-browser test environment */
      }
    }

    try {
      /* Listener first, then start the watcher — never miss an early emit. */
      if (!this.unlistenAccent) {
        this.unlistenAccent = await listen<AccentRgb | null>(
          'system:accent',
          (event) => {
            this.systemAccent = event.payload;
          },
        );
      }
      this.systemAccent = await watchSystemAccent();
    } catch {
      /* browser dev — no Tauri IPC; stock accent */
      this.systemAccent = null;
    }

    if (this.selection === 'system') {
      await this.detect();
    }

    /* appDataDir file is authoritative; reconcile over the mirror. */
    await this.loadFromDisk();

    this.startEffects();
  }

  /* ---------------------------------------------------------------- */
  /* Public mutations (the $effect handles apply + persist)           */
  /* ---------------------------------------------------------------- */

  async setTheme(selection: ThemeSelection): Promise<void> {
    this.selection = selection;
    if (selection === 'system') {
      await this.detect();
    }
    /* Before init completes there is no effect yet — apply directly. */
    if (!this.stopEffects) {
      this.applyActive();
      this.persist();
    }
  }

  setFollowSystemAccent(value: boolean): void {
    this.followSystemAccent = value;
  }

  /** Merge a partial config; switching any palette axis while a
   *  preset is active forks into the "custom" selection. */
  updateConfig(patch: Partial<ThemeConfig>): void {
    Object.assign(this.config, patch);
    if (
      this.selection !== 'custom' &&
      PALETTE_AXES.some((axis) => axis in patch)
    ) {
      this.selection = 'custom';
    }
    if (!this.stopEffects) {
      this.applyActive();
      this.persist();
    }
  }

  resetConfig(): void {
    this.updateConfig({ ...DEFAULT_THEME_CONFIG });
  }

  /* ---------------------------------------------------------------- */
  /* Apply                                                            */
  /* ---------------------------------------------------------------- */

  private startEffects(): void {
    if (this.stopEffects) return;
    this.stopEffects = $effect.root(() => {
      $effect(() => {
        /* Reads selection/detected/config/systemScheme/accent state —
         * any change recompiles, repaints :root, and persists. */
        this.applyActive();
        this.persist();
      });
    });
  }

  private applyActive(): void {
    const root = document.documentElement;

    if (this.selection === 'custom') {
      const compiled = compileConfig(this.config, this.resolvedScheme);
      for (const [key, value] of Object.entries(compiled.tokens)) {
        root.style.setProperty(`--${key}`, value);
      }
      root.setAttribute('data-theme', 'custom');
      root.setAttribute('data-style', compiled.style);
      root.style.colorScheme = compiled.colorScheme;
      this.resolvedId = 'custom';
      /* No accent override here — in custom mode the user's own
       * highlightColor is the accent. */
    } else {
      const id =
        this.selection === 'system'
          ? (this.detected ?? DEFAULT_THEME_ID)
          : this.selection;
      const theme = themes[id] ?? themes[DEFAULT_THEME_ID];
      for (const [key, value] of Object.entries(theme.tokens)) {
        root.style.setProperty(`--${key}`, value);
      }
      root.setAttribute('data-theme', theme.id);
      root.setAttribute('data-style', theme.style);
      /* Presets ship dark palettes only. */
      root.style.colorScheme = 'dark';
      this.resolvedId = theme.id;
      /* Accent override last, so it wins over the stock tokens.
       * Because the loop above rewrites every token, re-running is
       * also the revert path when the override turns off. */
      this.applyAccent();
    }

    /* Density/font-size modifiers apply over presets and custom. */
    for (const [key, value] of Object.entries(compileGlobalTokens(this.config))) {
      root.style.setProperty(`--${key}`, value);
    }
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

  private async detect(): Promise<void> {
    let desktop = '';
    try {
      desktop = await detectDesktopEnvironment();
    } catch {
      /* browser dev — no Tauri IPC; fall through to the default */
    }
    this.detected = themeForDesktop(desktop);
  }

  /* ---------------------------------------------------------------- */
  /* Persistence                                                      */
  /* ---------------------------------------------------------------- */

  private persist(): void {
    const json = JSON.stringify({
      version: 1,
      selection: this.selection,
      followSystemAccent: this.followSystemAccent,
      config: $state.snapshot(this.config),
    });
    try {
      localStorage.setItem(MIRROR_KEY, json);
    } catch {
      /* storage unavailable — fs copy still written below */
    }
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.writeToDisk(json);
    }, FS_WRITE_DEBOUNCE_MS);
  }

  private async writeToDisk(json: string): Promise<void> {
    try {
      const dir = await appDataDir();
      await mkdir(dir, { recursive: true });
      await writeTextFile(await join(dir, CONFIG_FILE), json);
    } catch {
      /* browser dev — no Tauri IPC; the mirror is the only copy */
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const dir = await appDataDir();
      const raw = await readTextFile(await join(dir, CONFIG_FILE));
      const state = this.parseState(JSON.parse(raw));
      if (state) {
        this.selection = state.selection;
        this.followSystemAccent = state.followSystemAccent;
        this.config = state.config;
        if (this.selection === 'system' && this.detected === null) {
          await this.detect();
        }
      }
    } catch {
      /* first launch, unreadable file, or browser dev — mirror wins */
    }
  }

  /** Mirror (or pre-engine legacy keys) → state, best-effort. */
  private readMirror(): PersistedState | null {
    try {
      const raw = localStorage.getItem(MIRROR_KEY);
      if (raw !== null) return this.parseState(JSON.parse(raw));
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy !== null) {
        return this.parseState({
          selection: legacy,
          followSystemAccent:
            localStorage.getItem(LEGACY_ACCENT_KEY) !== 'false',
        });
      }
    } catch {
      /* corrupt mirror or storage unavailable */
    }
    return null;
  }

  private parseState(data: unknown): PersistedState | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    const selection: ThemeSelection =
      d.selection === 'system' ||
      d.selection === 'custom' ||
      (typeof d.selection === 'string' && d.selection in themes)
        ? (d.selection as ThemeSelection)
        : 'system';
    const validated = validateThemeConfig(d.config ?? {});
    return {
      selection,
      followSystemAccent: d.followSystemAccent !== false,
      config: validated.ok ? validated.config : { ...DEFAULT_THEME_CONFIG },
    };
  }
}

export const themeStore = new ThemeStore();
