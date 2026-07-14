import { describe, expect, it } from 'vitest';
import { themeForDesktop } from './detect';
import { DEFAULT_THEME_ID } from './index';

describe('themeForDesktop', () => {
  it('maps KDE Plasma to breeze', () => {
    expect(themeForDesktop('KDE')).toBe('breeze');
    expect(themeForDesktop('plasma')).toBe('breeze');
  });

  it('maps GNOME to libadwaita', () => {
    expect(themeForDesktop('GNOME')).toBe('libadwaita');
    expect(themeForDesktop('ubuntu:GNOME')).toBe('libadwaita');
    expect(themeForDesktop('GNOME-Flashback:GNOME')).toBe('libadwaita');
  });

  it('maps Pop!_OS GNOME session to libadwaita, not cosmic', () => {
    expect(themeForDesktop('pop:GNOME')).toBe('libadwaita');
  });

  it('maps COSMIC to cosmic', () => {
    expect(themeForDesktop('COSMIC')).toBe('cosmic');
    expect(themeForDesktop('pop:COSMIC')).toBe('cosmic');
  });

  it('is case-insensitive', () => {
    expect(themeForDesktop('kde')).toBe('breeze');
    expect(themeForDesktop('Cosmic')).toBe('cosmic');
    expect(themeForDesktop('gnome')).toBe('libadwaita');
  });

  it('falls back to the default theme for unknown desktops', () => {
    expect(themeForDesktop('XFCE')).toBe(DEFAULT_THEME_ID);
    expect(themeForDesktop('Hyprland')).toBe(DEFAULT_THEME_ID);
    expect(themeForDesktop('')).toBe(DEFAULT_THEME_ID);
  });
});
