import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, themeList, themes } from './index';
import { iconSets } from '$lib/icons';

describe('theme registry', () => {
  it('contains the three built-in themes', () => {
    expect(Object.keys(themes)).toEqual(
      expect.arrayContaining(['breeze', 'libadwaita', 'cosmic']),
    );
  });

  it('registers every theme under its own id', () => {
    for (const [key, theme] of Object.entries(themes)) {
      expect(theme.id).toBe(key);
    }
  });

  it('has unique ids', () => {
    const ids = themeList.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves the default theme id', () => {
    expect(themes[DEFAULT_THEME_ID]).toBeDefined();
  });

  it('only declares dark palettes for now', () => {
    for (const theme of themeList) {
      expect(theme.appearance).toBe('dark');
    }
  });

  it('defines every token as a non-empty string', () => {
    for (const theme of themeList) {
      for (const [token, value] of Object.entries(theme.tokens)) {
        expect(typeof value, `${theme.id} → ${token}`).toBe('string');
        expect(value.trim().length, `${theme.id} → ${token}`).toBeGreaterThan(0);
      }
    }
  });

  it('declares the same token set across all themes', () => {
    const reference = Object.keys(themeList[0].tokens).sort();
    for (const theme of themeList) {
      expect(Object.keys(theme.tokens).sort()).toEqual(reference);
    }
  });

  it('declares a valid widget style', () => {
    for (const theme of themeList) {
      expect(['glass', 'flat'], theme.id).toContain(theme.style);
    }
  });

  it('keeps the HIG themes fully flat', () => {
    for (const id of ['breeze', 'libadwaita'] as const) {
      const theme = themes[id];
      expect(theme.style, id).toBe('flat');
      expect(theme.tokens['backdrop-blur'], id).toBe('none');
      expect(theme.tokens['glass-inset'], id).toBe('none');
      expect(theme.tokens['mesh-gradient'], id).toBe('none');
      expect(theme.tokens['shadow-card'], id).toBe('none');
    }
    expect(themes.cosmic.style).toBe('glass');
  });

  it('references a registered icon set when icons is declared', () => {
    for (const theme of themeList) {
      if (theme.icons) {
        expect(Object.keys(iconSets), theme.id).toContain(theme.icons);
      }
    }
  });
});
