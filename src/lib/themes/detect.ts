import type { ThemeId } from './types';
import { DEFAULT_THEME_ID } from './index';

/* Maps XDG_CURRENT_DESKTOP (colon-separated, case-insensitive per the
 * XDG spec) to a built-in theme id. COSMIC is checked before GNOME
 * because Pop!_OS reports "pop:GNOME" for its GNOME session while the
 * COSMIC DE reports its own "COSMIC" value. */
export function themeForDesktop(xdgCurrentDesktop: string): ThemeId {
  const desktop = xdgCurrentDesktop.toLowerCase();
  if (desktop.includes('kde') || desktop.includes('plasma')) return 'breeze';
  if (desktop.includes('cosmic')) return 'cosmic';
  if (desktop.includes('gnome')) return 'libadwaita';
  return DEFAULT_THEME_ID;
}
