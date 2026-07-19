import { describe, expect, it } from 'vitest';
import { aurora } from './aurora';
import { contrastRatio, oklchToRgb } from './color';
import { DEFAULT_THEME_CONFIG, type ThemeConfig } from './config';
import { compileConfig, compileGlobalTokens, highlightContrast } from './compile';

function config(patch: Partial<ThemeConfig> = {}): ThemeConfig {
  return { ...DEFAULT_THEME_CONFIG, ...patch };
}

/** Parse an `oklch(L C H)` token back into components. */
function parseOklchToken(token: string): { l: number; c: number; h: number } {
  const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(token);
  expect(m, `not an oklch token: ${token}`).not.toBeNull();
  return { l: +m![1], c: +m![2], h: +m![3] };
}

function oklchL(token: string): number {
  return parseOklchToken(token).l;
}

describe('compileConfig', () => {
  it('emits every ThemeTokens key the presets declare', () => {
    const { tokens } = compileConfig(config(), 'dark');
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(aurora.tokens).sort());
  });

  it('orders the surface ladder by scheme', () => {
    const dark = compileConfig(config(), 'dark').tokens;
    expect(oklchL(dark['color-base-100'])).toBeLessThan(0.3);
    expect(oklchL(dark['color-base-content'])).toBeGreaterThan(0.9);

    const light = compileConfig(config(), 'light').tokens;
    expect(oklchL(light['color-base-100'])).toBeGreaterThan(0.9);
    expect(oklchL(light['color-base-content'])).toBeLessThan(0.3);
  });

  it('reports the resolved scheme for the color-scheme property', () => {
    expect(compileConfig(config(), 'light').colorScheme).toBe('light');
    expect(compileConfig(config(), 'dark').colorScheme).toBe('dark');
  });

  it('translucency 0 compiles to a flat, solid theme', () => {
    const { tokens, style } = compileConfig(config({ translucency: 0 }), 'dark');
    expect(style).toBe('flat');
    expect(tokens['backdrop-blur']).toBe('none');
    expect(tokens['glass-inset']).toBe('none');
    expect(tokens['surface-card']).not.toContain('transparent');
  });

  it('translucency 1 compiles to heavy glass', () => {
    const { tokens, style } = compileConfig(config({ translucency: 1 }), 'dark');
    expect(style).toBe('glass');
    expect(tokens['backdrop-blur']).toContain('blur(20px)');
  });

  it('maps roundness onto the radius scale', () => {
    expect(compileConfig(config({ roundness: 'sharp' }), 'dark').tokens['radius-button']).toBe('2px');
    expect(compileConfig(config({ roundness: 'pill' }), 'dark').tokens['radius-button']).toBe('9999px');
  });

  it('keeps the primary legible on the surface for any highlight', () => {
    for (const highlightColor of ['#111111', '#f8f8ff', '#0400ff']) {
      for (const scheme of ['dark', 'light'] as const) {
        const { tokens } = compileConfig(config({ highlightColor }), scheme);
        const primary = oklchToRgb(parseOklchToken(tokens['color-primary']));
        const surface = oklchToRgb(parseOklchToken(tokens['color-base-100']));
        expect(contrastRatio(primary, surface)).toBeGreaterThanOrEqual(2.5);
      }
    }
  });

  it('falls back safely when config colors are unparseable', () => {
    /* validateThemeConfig prevents this, but compile must not throw. */
    const broken = config({ baseColor: 'nope', highlightColor: 'also nope' });
    expect(() => compileConfig(broken, 'dark')).not.toThrow();
  });
});

describe('compileGlobalTokens', () => {
  it('maps density onto the Tailwind spacing unit', () => {
    expect(compileGlobalTokens(config({ density: 'compact' })).spacing).toBe('0.2rem');
    expect(compileGlobalTokens(config({ density: 'spacious' })).spacing).toBe('0.3rem');
  });

  it('maps fontSize onto the rem root', () => {
    expect(compileGlobalTokens(config({ fontSize: 'small' }))['font-base']).toBe('0.875rem');
    expect(compileGlobalTokens(config({ fontSize: 'large' }))['font-base']).toBe('1.125rem');
  });
});

describe('highlightContrast', () => {
  it('reports at least the enforced UI-component ratio', () => {
    expect(highlightContrast(config(), 'dark')).toBeGreaterThanOrEqual(3);
    expect(highlightContrast(config({ highlightColor: '#16161e' }), 'dark')).toBeGreaterThanOrEqual(3);
  });

  it('returns 0 for unparseable colors', () => {
    expect(highlightContrast(config({ baseColor: 'bad' }), 'dark')).toBe(0);
  });
});
