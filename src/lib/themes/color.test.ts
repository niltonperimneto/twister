import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  deriveSurfaces,
  ensureContrast,
  oklchToRgb,
  parseColor,
  readableOn,
  relativeLuminance,
  rgbToHex,
  rgbToOklch,
} from './color';

const WHITE = { r: 1, g: 1, b: 1 };
const BLACK = { r: 0, g: 0, b: 0 };

describe('parseColor', () => {
  it('parses #rrggbb and #rgb hex', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(parseColor('#fff')).toEqual({ r: 1, g: 1, b: 1 });
    expect(parseColor('  #00FF00 ')).toEqual({ r: 0, g: 1, b: 0 });
  });

  it('parses hsl() in comma and space syntax', () => {
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 1, g: 0, b: 0 });
    const blue = parseColor('hsl(240 100% 50%)')!;
    expect(blue.b).toBeCloseTo(1);
    expect(blue.r).toBeCloseTo(0);
    /* alpha is accepted and ignored */
    expect(parseColor('hsla(0, 100%, 50%, 0.5)')).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('rejects malformed input', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('#12345')).toBeNull();
    expect(parseColor('red')).toBeNull();
    expect(parseColor('rgb(1,2,3)')).toBeNull();
  });

  it('round-trips through rgbToHex', () => {
    expect(rgbToHex(parseColor('#6ea8fe')!)).toBe('#6ea8fe');
    expect(rgbToHex(parseColor('#1c1d27')!)).toBe('#1c1d27');
  });
});

describe('contrast math', () => {
  it('gives 21:1 for black on white', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21);
  });

  it('gives 1:1 for identical colors', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1);
  });

  it('computes known luminances', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0);
  });

  it('readableOn picks light text on dark and dark text on light', () => {
    expect(readableOn(BLACK)).toBe('oklch(0.98 0 0)');
    expect(readableOn(WHITE)).toBe('oklch(0.2 0.01 260)');
  });
});

describe('oklch conversion', () => {
  it('round-trips sRGB colors', () => {
    for (const hex of ['#6ea8fe', '#1c1d27', '#ffffff', '#c02040']) {
      const rgb = parseColor(hex)!;
      const back = oklchToRgb(rgbToOklch(rgb));
      expect(back.r).toBeCloseTo(rgb.r, 2);
      expect(back.g).toBeCloseTo(rgb.g, 2);
      expect(back.b).toBeCloseTo(rgb.b, 2);
    }
  });

  it('maps white/black to L≈1/L≈0', () => {
    expect(rgbToOklch(WHITE).l).toBeCloseTo(1, 2);
    expect(rgbToOklch(BLACK).l).toBeCloseTo(0, 2);
  });
});

describe('deriveSurfaces', () => {
  const base = parseColor('#3a2b52')!; /* saturated purple */

  it('imposes a descending lightness ladder in dark mode', () => {
    const d = deriveSurfaces(base, 'dark');
    expect(d.base100.l).toBeGreaterThan(d.base200.l);
    expect(d.base200.l).toBeGreaterThan(d.base300.l);
    expect(d.baseContent.l).toBeGreaterThan(0.9);
  });

  it('flips the ladder light and keeps the hue', () => {
    const l = deriveSurfaces(base, 'light');
    expect(l.base100.l).toBeGreaterThan(0.95);
    expect(l.baseContent.l).toBeLessThan(0.3);
    expect(l.base100.h).toBeCloseTo(rgbToOklch(base).h, 0);
  });

  it('keeps text legible regardless of the base color', () => {
    for (const hex of ['#000000', '#ffffff', '#ff0000', '#3a2b52']) {
      for (const scheme of ['dark', 'light'] as const) {
        const s = deriveSurfaces(parseColor(hex)!, scheme);
        const ratio = contrastRatio(oklchToRgb(s.baseContent), oklchToRgb(s.base100));
        expect(ratio).toBeGreaterThanOrEqual(7);
      }
    }
  });
});

describe('ensureContrast', () => {
  it('lightens a too-dark highlight against a dark surface', () => {
    const darkBg = parseColor('#16161e')!;
    const dim = parseColor('#22223a')!;
    const fixed = ensureContrast(dim, darkBg, 3);
    expect(contrastRatio(oklchToRgb(fixed), darkBg)).toBeGreaterThanOrEqual(3);
  });

  it('darkens a too-light highlight against a light surface', () => {
    const lightBg = parseColor('#f5f5fa')!;
    const pale = parseColor('#e0e8ff')!;
    const fixed = ensureContrast(pale, lightBg, 3);
    expect(contrastRatio(oklchToRgb(fixed), lightBg)).toBeGreaterThanOrEqual(3);
  });

  it('leaves an already-passing color untouched', () => {
    const bg = parseColor('#16161e')!;
    const fg = parseColor('#6ea8fe')!;
    expect(ensureContrast(fg, bg, 3)).toEqual(rgbToOklch(fg));
  });
});
