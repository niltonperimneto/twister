import { describe, expect, it } from 'vitest';
import { accentContentColor, accentToCss } from './accent';

describe('accentToCss', () => {
  it('converts a valid portal triple to an rgb() percentage string', () => {
    expect(accentToCss([0.24, 0.68, 0.91])).toBe('rgb(24.00% 68.00% 91.00%)');
    expect(accentToCss([0, 0, 0])).toBe('rgb(0.00% 0.00% 0.00%)');
    expect(accentToCss([1, 1, 1])).toBe('rgb(100.00% 100.00% 100.00%)');
  });

  it('treats out-of-range components as "no preference"', () => {
    expect(accentToCss([-1, 0, 0])).toBeNull();
    expect(accentToCss([0, 0, 2])).toBeNull();
    expect(accentToCss([1.0001, 0.5, 0.5])).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(accentToCss(null)).toBeNull();
    expect(accentToCss(undefined)).toBeNull();
    expect(accentToCss([])).toBeNull();
    expect(accentToCss([0.5, 0.5])).toBeNull();
    expect(accentToCss([0.5, 0.5, 0.5, 0.5])).toBeNull();
    expect(accentToCss([Number.NaN, 0.5, 0.5])).toBeNull();
    expect(accentToCss([Number.POSITIVE_INFINITY, 0.5, 0.5])).toBeNull();
  });
});

describe('accentContentColor', () => {
  const NEAR_WHITE = 'oklch(0.98 0 0)';
  const NEAR_BLACK = 'oklch(0.2 0.01 260)';

  it('picks near-white text over dark accents', () => {
    expect(accentContentColor([0.1, 0.1, 0.3])).toBe(NEAR_WHITE);
    expect(accentContentColor([0, 0, 0])).toBe(NEAR_WHITE);
    expect(accentContentColor([0.5, 0, 0])).toBe(NEAR_WHITE);
  });

  it('picks near-black text over light accents', () => {
    expect(accentContentColor([1, 0.8, 0.2])).toBe(NEAR_BLACK);
    expect(accentContentColor([1, 1, 1])).toBe(NEAR_BLACK);
    expect(accentContentColor([0.4, 0.9, 0.4])).toBe(NEAR_BLACK);
  });

  it('switches around the L ≈ 0.179 luminance boundary', () => {
    /* pure gray with luminance just below/above the threshold:
       lin(c) = ((c + 0.055) / 1.055)^2.4 = L  ⇒  c ≈ 0.4735 at L = 0.1791 */
    expect(accentContentColor([0.46, 0.46, 0.46])).toBe(NEAR_WHITE);
    expect(accentContentColor([0.49, 0.49, 0.49])).toBe(NEAR_BLACK);
  });
});
