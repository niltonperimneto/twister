import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from './types';
import { defaultIconSet, iconSets } from './index';

describe('icon registry', () => {
  it('default set defines every icon name with a non-empty body', () => {
    for (const name of ICON_NAMES) {
      const glyph = defaultIconSet.glyphs[name];
      expect(glyph, name).toBeDefined();
      expect(glyph!.body.trim().length, name).toBeGreaterThan(0);
    }
  });

  it('themed sets only use known icon names', () => {
    for (const [setId, set] of Object.entries(iconSets)) {
      for (const key of Object.keys(set.glyphs)) {
        expect(ICON_NAMES, `${setId} → ${key}`).toContain(key);
      }
    }
  });

  it('themed sets are non-empty', () => {
    for (const [setId, set] of Object.entries(iconSets)) {
      expect(Object.keys(set.glyphs).length, setId).toBeGreaterThan(10);
    }
  });

  it('themed glyphs are normalized (currentColor, no stylesheets)', () => {
    for (const [setId, set] of Object.entries(iconSets)) {
      for (const [name, glyph] of Object.entries(set.glyphs)) {
        expect(glyph!.body, `${setId} → ${name}`).not.toMatch(/fill="#/);
        expect(glyph!.body, `${setId} → ${name}`).not.toMatch(/<style/);
        expect(glyph!.body, `${setId} → ${name}`).not.toMatch(/<defs/);
      }
    }
  });

  it('viewBoxes are well-formed', () => {
    const pattern = /^0 0 \d+(\.\d+)? \d+(\.\d+)?$/;
    for (const set of [defaultIconSet, ...Object.values(iconSets)]) {
      expect(set.viewBox).toMatch(pattern);
      for (const glyph of Object.values(set.glyphs)) {
        if (glyph!.viewBox) expect(glyph!.viewBox).toMatch(pattern);
      }
    }
  });
});
