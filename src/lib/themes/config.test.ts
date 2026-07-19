import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_CONFIG,
  validateThemeConfig,
  type ThemeConfig,
} from './config';

const VALID: ThemeConfig = {
  colorScheme: 'system',
  density: 'compact',
  fontSize: 'large',
  baseColor: '#123456',
  highlightColor: 'hsl(200, 80%, 60%)',
  iconTheme: 'breeze',
  roundness: 'pill',
  translucency: 0.4,
};

describe('validateThemeConfig', () => {
  it('accepts a fully valid config', () => {
    const result = validateThemeConfig(VALID);
    expect(result).toEqual({ ok: true, config: VALID });
  });

  it('back-fills missing keys with defaults (older exports)', () => {
    const result = validateThemeConfig({ colorScheme: 'light' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.colorScheme).toBe('light');
      expect(result.config.density).toBe(DEFAULT_THEME_CONFIG.density);
      expect(result.config.baseColor).toBe(DEFAULT_THEME_CONFIG.baseColor);
    }
  });

  it('strips unknown keys ($schema tag, future fields)', () => {
    const result = validateThemeConfig({ ...VALID, $schema: 'twister-theme/v1', extra: 1 });
    expect(result).toEqual({ ok: true, config: VALID });
  });

  it('rejects invalid union values with a message naming the field', () => {
    const result = validateThemeConfig({ ...VALID, density: 'cozy' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('"density"');
  });

  it('rejects unparseable colors', () => {
    const result = validateThemeConfig({ ...VALID, baseColor: 'reddish' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('"baseColor"');
  });

  it('clamps translucency into 0–1 but rejects non-numbers', () => {
    const clamped = validateThemeConfig({ ...VALID, translucency: 3 });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) expect(clamped.config.translucency).toBe(1);

    expect(validateThemeConfig({ ...VALID, translucency: 'glass' }).ok).toBe(false);
    expect(validateThemeConfig({ ...VALID, translucency: Number.NaN }).ok).toBe(false);
  });

  it('rejects non-objects outright', () => {
    for (const bad of [null, 'theme', 7, [VALID]]) {
      expect(validateThemeConfig(bad).ok).toBe(false);
    }
  });

  it('collects multiple errors in one pass', () => {
    const result = validateThemeConfig({
      ...VALID,
      roundness: 'circle',
      highlightColor: 'nope',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });
});
