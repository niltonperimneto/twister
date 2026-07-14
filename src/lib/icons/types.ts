/* Icon system core types.
 *
 * Icons are semantic names resolved against per-theme sets: the default
 * set (Lucide-style strokes, always complete) plus symbolic sets fetched
 * from the Breeze / Adwaita / COSMIC upstream icon themes. A themed set
 * may omit any glyph; Icon.svelte falls back to the default per-glyph. */

export const ICON_NAMES = [
  'chevrons-right',
  'mouse',
  'sun',
  'check',
  'home',
  'heart',
  'info',
  'panel-left',
  'clock',
  'keyboard',
  'chevron-left',
  'layers',
  'wand-2',
  'palette',
  'gauge',
  'file-code',
  'menu',
  'minimize',
  'maximize',
  'close',
  'github',
  'external-link',
  'refresh',
  'users',
  'shield',
  'settings',
  'chevron-down',
  'alert-circle',
  'star',
  'user-plus',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export type IconSetId = 'breeze' | 'adwaita' | 'cosmic';

export interface IconGlyph {
  /** Inner-SVG markup (no <svg> wrapper). */
  body: string;
  /** Per-glyph viewBox; falls back to the set default when absent. */
  viewBox?: string;
}

export interface IconSet {
  /** Default viewBox for glyphs that don't declare their own. */
  viewBox: string;
  /** Wrapper <svg> attributes — stroke-based vs fill-based rendering. */
  attrs: Record<string, string>;
  glyphs: Partial<Record<IconName, IconGlyph>>;
}
