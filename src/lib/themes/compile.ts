/* ThemeConfig → tokens compiler.
 *
 * Emits the exact ThemeTokens shape the hand-crafted presets declare,
 * so the store can apply a compiled custom theme through the same
 * setProperty loop with zero special-casing downstream. Palette
 * tokens derive from baseColor/highlightColor with contrast
 * guarantees; roundness/translucency map onto the radius and glass
 * tokens; density/fontSize compile separately (GLOBAL_TOKEN_KEYS)
 * because they also apply over presets. */

import type { ThemeTokens } from './types';
import type { Density, FontSize, ThemeConfig } from './config';
import {
  contrastRatio,
  deriveSurfaces,
  ensureContrast,
  oklchCss,
  oklchToRgb,
  parseColor,
  readableOn,
} from './color';

/** Tokens applied over any theme, preset or custom. `spacing` feeds
 *  Tailwind 4's --spacing (every padding/gap utility is a multiple of
 *  it); `font-base` feeds the root font-size in rem. */
export interface ConfigTokens {
  spacing: string;
  'font-base': string;
}

export const GLOBAL_TOKEN_KEYS = ['spacing', 'font-base'] as const;

const SPACING: Record<Density, string> = {
  compact: '0.2rem',
  comfortable: '0.25rem',
  spacious: '0.3rem',
};

const FONT_BASE: Record<FontSize, string> = {
  small: '0.875rem',
  standard: '1rem',
  large: '1.125rem',
};

export function compileGlobalTokens(config: ThemeConfig): ConfigTokens {
  return {
    spacing: SPACING[config.density],
    'font-base': FONT_BASE[config.fontSize],
  };
}

export interface CompiledTheme {
  tokens: ThemeTokens;
  /** For the CSS color-scheme property (native widgets, scrollbars). */
  colorScheme: 'light' | 'dark';
  /** Mirrors Theme.style for the data-style attribute CSS gates on. */
  style: 'glass' | 'flat';
}

const RADII = {
  sharp: { xs: '0px', sm: '1px', md: '2px', lg: '3px', full: '4px', button: '2px' },
  rounded: { xs: '4px', sm: '6px', md: '8px', lg: '12px', full: '9999px', button: '8px' },
  pill: { xs: '8px', sm: '10px', md: '14px', lg: '20px', full: '9999px', button: '9999px' },
} as const;

const FONT_STACK = "'Inter', system-ui, sans-serif";

export function compileConfig(
  config: ThemeConfig,
  resolvedScheme: 'light' | 'dark',
): CompiledTheme {
  const base = parseColor(config.baseColor) ?? parseColor('#1c1d27')!;
  const highlight = parseColor(config.highlightColor) ?? parseColor('#6ea8fe')!;

  const ladder = deriveSurfaces(base, resolvedScheme);
  const base100Rgb = oklchToRgb(ladder.base100);

  /* Highlight must read as interactive against the surfaces (WCAG
   * 3:1 for UI components); its own label text follows from it. */
  const primary = ensureContrast(highlight, base100Rgb, 3);
  const primaryRgb = oklchToRgb(primary);
  const secondary = { ...primary, h: (primary.h + 60) % 360 };

  const t = Math.min(1, Math.max(0, config.translucency));
  const glass = t > 0.05;
  const r = RADII[config.roundness];

  /* Surface alpha: solid at t=0, airy at t=1. */
  const surfaceAlpha = 1 - 0.6 * t;

  const semantic =
    resolvedScheme === 'dark'
      ? {
          info: 'oklch(0.7 0.1 230)',
          success: 'oklch(0.7 0.15 160)',
          warning: 'oklch(0.75 0.15 80)',
          error: 'oklch(0.65 0.2 25)',
        }
      : {
          info: 'oklch(0.55 0.12 230)',
          success: 'oklch(0.52 0.14 160)',
          warning: 'oklch(0.6 0.13 80)',
          error: 'oklch(0.55 0.2 25)',
        };

  const tokens: ThemeTokens = {
    'color-primary': oklchCss(primary),
    'color-primary-content': readableOn(primaryRgb),
    'color-secondary': oklchCss(secondary),
    'color-secondary-content': readableOn(oklchToRgb(secondary)),
    'color-base-100': oklchCss(ladder.base100),
    'color-base-200': oklchCss(ladder.base200),
    'color-base-300': oklchCss(ladder.base300),
    'color-base-content': oklchCss(ladder.baseContent),
    'color-info': semantic.info,
    'color-success': semantic.success,
    'color-warning': semantic.warning,
    'color-error': semantic.error,

    'radius-xs': r.xs,
    'radius-sm': r.sm,
    'radius-md': r.md,
    'radius-lg': r.lg,
    'radius-full': r.full,
    'radius-button': r.button,

    'surface-base': oklchCss(ladder.surfaceBase),
    'surface-picker': oklchCss(ladder.base200, Math.max(0.5, surfaceAlpha)),

    'surface-card': glass
      ? `linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) ${round1(6 + 6 * t)}%, transparent), color-mix(in oklab, var(--color-base-content) ${round1(3 + 4 * t)}%, transparent))`
      : 'var(--color-base-200)',
    'border-card':
      resolvedScheme === 'dark' ? 'oklch(0.4 0 0 / 0.18)' : 'oklch(0.72 0 0 / 0.4)',
    'shadow-card': glass
      ? 'var(--glass-inset), 0 4px 16px oklch(0 0 0 / 0.25), 0 1px 3px oklch(0 0 0 / 0.15)'
      : '0 1px 3px oklch(0 0 0 / 0.12)',

    'button-bg':
      'linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) 13%, transparent), color-mix(in oklab, var(--color-base-content) 8%, transparent))',
    'button-bg-hover':
      'color-mix(in oklab, var(--color-base-content) 16%, transparent)',
    'button-border':
      resolvedScheme === 'dark' ? 'oklch(0.45 0 0 / 0.25)' : 'oklch(0.6 0 0 / 0.35)',
    'button-border-hover':
      resolvedScheme === 'dark' ? 'oklch(0.55 0 0 / 0.4)' : 'oklch(0.5 0 0 / 0.5)',

    'selection-bg':
      'linear-gradient(to bottom, color-mix(in oklab, var(--color-primary) 25%, transparent), color-mix(in oklab, var(--color-primary) 15%, transparent))',
    'selection-fg':
      'color-mix(in oklab, var(--color-primary) 25%, var(--color-base-content))',

    'font-ui': FONT_STACK,
    'font-display': FONT_STACK,

    'backdrop-blur': glass
      ? `blur(${round1(4 + 16 * t)}px) saturate(${round1(1 + 0.4 * t)})`
      : 'none',
    'glass-inset': glass ? 'inset 0 1px 0 0 oklch(1 0 0 / 0.08)' : 'none',

    'mesh-gradient': 'none',
  };

  return { tokens, colorScheme: resolvedScheme, style: glass ? 'glass' : 'flat' };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Contrast ratio between the compiled highlight and base surface —
 *  what the settings panel shows/warns on. */
export function highlightContrast(config: ThemeConfig, scheme: 'light' | 'dark'): number {
  const base = parseColor(config.baseColor);
  const highlight = parseColor(config.highlightColor);
  if (!base || !highlight) return 0;
  const ladder = deriveSurfaces(base, scheme);
  const primary = ensureContrast(highlight, oklchToRgb(ladder.base100), 3);
  return contrastRatio(oklchToRgb(primary), oklchToRgb(ladder.base100));
}
