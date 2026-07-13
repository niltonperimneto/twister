/* Theme engine core types.
 *
 * A theme is a flat map of design-token primitives. Every key is
 * required, so a theme that forgets a token fails `bun run check`
 * and switching themes can blindly overwrite all properties without
 * stale-token cleanup. Derived values (alpha washes, gradients over
 * the accent) are computed in app.css with color-mix(), so themes
 * only declare primitives. */

export type ThemeId = string;

/** Persisted user choice: an explicit theme id, or "system" to
 *  re-detect the desktop environment on every launch. */
export type ThemeSelection = 'system' | ThemeId;

export interface ThemeTokens {
  /* DaisyUI / Tailwind color tokens (override the @theme block) */
  'color-primary': string;
  'color-primary-content': string;
  'color-secondary': string;
  'color-secondary-content': string;
  'color-base-100': string;
  'color-base-200': string;
  'color-base-300': string;
  'color-base-content': string;
  'color-info': string;
  'color-success': string;
  'color-warning': string;
  'color-error': string;

  /* Corner radius scale (Breeze small, Adwaita medium, COSMIC round) */
  'radius-xs': string;
  'radius-sm': string;
  'radius-md': string;
  'radius-lg': string;
  'radius-full': string;

  /* Opaque window surfaces */
  'surface-base': string;
  'surface-picker': string;

  /* Glass compositing — "none" for both yields a flat theme */
  'backdrop-blur': string;
  'glass-inset': string;

  /* Full background value for the .app-root::before mesh layer,
   * or "none" for flat themes */
  'mesh-gradient': string;
}

export interface Theme {
  id: ThemeId;
  /** Display name shown in the theme picker. */
  name: string;
  /** One-line description of the theme's look. */
  description: string;
  /** Only dark palettes are supported today. */
  appearance: 'dark';
  tokens: ThemeTokens;
}
