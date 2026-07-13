import type { Theme } from './types';

/* GNOME Libadwaita Dark — flat and neutral. GNOME blue accent over
 * pure grays, no blur, no mesh texture: --surface-base alone carries
 * the window background. */

export const libadwaita: Theme = {
  id: 'libadwaita',
  name: 'Libadwaita',
  description: 'GNOME blue on flat neutral grays, no glass',
  appearance: 'dark',
  tokens: {
    'color-primary': 'oklch(0.73 0.11 255)' /* #78aeed / #3584e4 family */,
    'color-primary-content': 'oklch(0.98 0.02 255)',
    'color-secondary': 'oklch(0.72 0.12 320)' /* Adwaita purple family */,
    'color-secondary-content': 'oklch(0.98 0.02 320)',
    'color-base-100': 'oklch(0.28 0 0)' /* #303030 headerbar */,
    'color-base-200': 'oklch(0.24 0 0)' /* #242424 window */,
    'color-base-300': 'oklch(0.21 0 0)' /* #1d1d1d view */,
    'color-base-content': 'oklch(0.95 0 0)',
    'color-info': 'oklch(0.7 0.1 230)',
    'color-success': 'oklch(0.72 0.15 150)' /* #26a269 family */,
    'color-warning': 'oklch(0.78 0.13 90)' /* #cd9309 family */,
    'color-error': 'oklch(0.62 0.19 15)' /* #c01c28 family */,

    'radius-xs': '6px',
    'radius-sm': '8px',
    'radius-md': '9px',
    'radius-lg': '12px',
    'radius-full': '9999px',

    'surface-base': 'oklch(0.24 0 0)',
    'surface-picker': 'oklch(0.28 0 0 / 0.5)',

    'backdrop-blur': 'none',
    'glass-inset': 'none',

    'mesh-gradient': 'none',
  },
};
