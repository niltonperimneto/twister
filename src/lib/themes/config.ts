/* ThemeConfig — the 8-axis parametric theme document.
 *
 * A config compiles into the same ThemeTokens shape the hand-crafted
 * presets declare (see compile.ts), registered as the "custom" theme
 * selection. `density` and `fontSize` are global modifiers applied
 * over presets too; the remaining axes only take effect in custom
 * mode. Exported .json themes are validated with validateThemeConfig
 * before being applied. */

import { parseColor } from './color';

export const COLOR_SCHEMES = ['light', 'dark', 'system'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];

export const FONT_SIZES = ['small', 'standard', 'large'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const ROUNDNESS_VALUES = ['sharp', 'rounded', 'pill'] as const;
export type Roundness = (typeof ROUNDNESS_VALUES)[number];

/** "system" follows the active theme's icon set (preset behavior);
 *  the rest force a registered glyph set from $lib/icons. */
export const ICON_THEMES = ['system', 'default', 'adwaita', 'breeze', 'cosmic'] as const;
export type IconThemeChoice = (typeof ICON_THEMES)[number];

export interface ThemeConfig {
  /** "system" defers to the OS light/dark preference. */
  colorScheme: ColorScheme;
  /** Rescales --spacing (all padding/gap utilities) globally. */
  density: Density;
  /** Scales the root --font-base in rem. */
  fontSize: FontSize;
  /** Hex or hsl(); backgrounds and surfaces derive from its hue. */
  baseColor: string;
  /** Hex or hsl(); interactive elements, focus, primary actions. */
  highlightColor: string;
  /** Glyph set for the Icon component. */
  iconTheme: IconThemeChoice;
  /** Controls --radius-* on buttons, cards, and dialogs. */
  roundness: Roundness;
  /** 0 = solid surfaces, 1 = maximum glass (alpha + backdrop blur). */
  translucency: number;
}

/* Aurora-adjacent defaults: charcoal base, Dracula-blue highlight. */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colorScheme: 'dark',
  density: 'comfortable',
  fontSize: 'standard',
  baseColor: '#1c1d27',
  highlightColor: '#6ea8fe',
  iconTheme: 'system',
  roundness: 'rounded',
  translucency: 0.65,
};

export type ValidationResult =
  | { ok: true; config: ThemeConfig }
  | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate untrusted data (imported .json, persisted state) into a
 *  ThemeConfig. Missing keys fall back to defaults so older exports
 *  stay importable; present-but-invalid values are hard errors so a
 *  corrupted file never half-applies. Unknown keys are stripped. */
export function validateThemeConfig(data: unknown): ValidationResult {
  if (!isRecord(data)) {
    return { ok: false, errors: ['Theme must be a JSON object.'] };
  }

  const errors: string[] = [];
  const config = { ...DEFAULT_THEME_CONFIG };

  const pickUnion = <K extends keyof ThemeConfig>(
    key: K,
    allowed: readonly ThemeConfig[K][],
  ) => {
    const v = data[key];
    if (v === undefined) return;
    if (allowed.includes(v as ThemeConfig[K])) {
      config[key] = v as ThemeConfig[K];
    } else {
      errors.push(`"${key}" must be one of: ${allowed.join(', ')}.`);
    }
  };

  const pickColor = (key: 'baseColor' | 'highlightColor') => {
    const v = data[key];
    if (v === undefined) return;
    if (typeof v === 'string' && parseColor(v) !== null) {
      config[key] = v;
    } else {
      errors.push(`"${key}" must be a hex (#rrggbb) or hsl() color.`);
    }
  };

  pickUnion('colorScheme', COLOR_SCHEMES);
  pickUnion('density', DENSITIES);
  pickUnion('fontSize', FONT_SIZES);
  pickUnion('iconTheme', ICON_THEMES);
  pickUnion('roundness', ROUNDNESS_VALUES);
  pickColor('baseColor');
  pickColor('highlightColor');

  const t = data.translucency;
  if (t !== undefined) {
    if (typeof t === 'number' && Number.isFinite(t)) {
      config.translucency = Math.min(1, Math.max(0, t));
    } else {
      errors.push('"translucency" must be a number between 0 and 1.');
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, config };
}
