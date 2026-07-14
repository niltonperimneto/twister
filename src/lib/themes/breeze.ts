import type { Theme } from './types';

/* KDE Breeze Dark — faithful to the Kirigami HIG / Breeze widget style:
 * flat opaque surfaces, 5px frame radius (Frame_FrameRadius), solid
 * Plasma-blue selection, and buttons that show the accent outline on
 * hover (DecorationHover). Palette from KDE/breeze BreezeDark.colors:
 * window rgb(32,35,38), view rgb(20,22,24), button rgb(41,44,48),
 * selection rgb(61,174,233). */

export const breeze: Theme = {
  id: 'breeze',
  name: 'Breeze',
  description: 'KDE Breeze dark — flat Plasma widgets per the Kirigami HIG',
  appearance: 'dark',
  style: 'flat',
  icons: 'breeze',
  tokens: {
    'color-primary': 'oklch(0.71 0.13 235)' /* Plasma #3daee9 */,
    'color-primary-content': 'oklch(0.99 0 0)' /* Breeze #fcfcfc */,
    'color-secondary': 'oklch(0.65 0.12 300)',
    'color-secondary-content': 'oklch(0.98 0.02 300)',
    'color-base-100': 'oklch(0.3 0.007 245)' /* button/header #292c30 */,
    'color-base-200': 'oklch(0.27 0.006 240)' /* window #202326 */,
    'color-base-300': 'oklch(0.21 0.005 240)' /* view #141618 */,
    'color-base-content': 'oklch(0.99 0 0)' /* #fcfcfc */,
    'color-info': 'oklch(0.7 0.1 230)' /* #29b6f6 family */,
    'color-success': 'oklch(0.7 0.14 145)' /* #27ae60 */,
    'color-warning': 'oklch(0.76 0.14 85)' /* #fdbc4b */,
    'color-error': 'oklch(0.6 0.19 20)' /* #da4453 */,

    'radius-xs': '3px',
    'radius-sm': '4px',
    'radius-md': '5px' /* Frame_FrameRadius */,
    'radius-lg': '6px',
    'radius-full': '9999px',
    'radius-button': '5px',

    'surface-base': 'oklch(0.27 0.006 240)' /* window */,
    'surface-picker': 'oklch(0.21 0.005 240)' /* view, opaque */,

    'surface-card': 'oklch(0.3 0.007 245)' /* solid button-role surface */,
    'border-card': 'oklch(1 0 0 / 0.09)' /* Breeze separator */,
    'shadow-card': 'none',

    'button-bg': 'oklch(0.3 0.007 245)' /* Button BackgroundNormal */,
    'button-bg-hover': 'oklch(0.32 0.008 245)',
    'button-border': 'oklch(1 0 0 / 0.12)',
    'button-border-hover': 'var(--color-primary)' /* DecorationHover */,

    'selection-bg': 'var(--color-primary)' /* solid accent selection */,
    'selection-fg': 'var(--color-primary-content)',

    'font-ui': "'Noto Sans', 'Inter', system-ui, sans-serif",

    'backdrop-blur': 'none',
    'glass-inset': 'none',
    'mesh-gradient': 'none',
  },
};
