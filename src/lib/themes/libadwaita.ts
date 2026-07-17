import type { Theme } from './types';

/* GNOME Libadwaita Dark — faithful to the GNOME HIG / libadwaita
 * stylesheet: fully flat, borderless bold buttons filled with a
 * currentColor wash (10% rest / 15% hover), white/8% cards at 12px,
 * 9px button radius. Palette from GNOME/libadwaita _colors.scss dark:
 * window #222226, view #1d1d20, headerbar/sidebar #2e2e32, accent
 * #3584e4, success #26a269, warning #cd9309, error #c01c28. */

export const libadwaita: Theme = {
  id: 'libadwaita',
  name: 'Libadwaita',
  description: 'GNOME Adwaita dark — flat libadwaita widgets per the GNOME HIG',
  appearance: 'dark',
  style: 'flat',
  icons: 'adwaita',
  tokens: {
    'color-primary': 'oklch(0.6 0.177 259)' /* accent_bg #3584e4 */,
    'color-primary-content': 'oklch(1 0 0)' /* white */,
    'color-secondary': 'oklch(0.62 0.19 320)' /* purple_3 #9141ac */,
    'color-secondary-content': 'oklch(1 0 0)',
    'color-base-100': 'oklch(0.3 0.005 285)' /* headerbar/sidebar #2e2e32 */,
    'color-base-200': 'oklch(0.25 0.005 285)' /* window #222226 */,
    'color-base-300': 'oklch(0.23 0.004 285)' /* view #1d1d20 */,
    'color-base-content': 'oklch(1 0 0)' /* window_fg white */,
    'color-info': 'oklch(0.7 0.1 230)',
    'color-success': 'oklch(0.62 0.14 155)' /* #26a269 */,
    'color-warning': 'oklch(0.68 0.14 80)' /* #cd9309 */,
    'color-error': 'oklch(0.5 0.19 20)' /* #c01c28 */,

    'radius-xs': '6px',
    'radius-sm': '6px',
    'radius-md': '9px' /* $button_radius */,
    'radius-lg': '12px' /* $card_radius */,
    'radius-full': '9999px',
    'radius-button': '9px',

    'surface-base': 'oklch(0.25 0.005 285)' /* window */,
    'surface-picker': 'oklch(0.23 0.004 285)' /* view, opaque */,

    'surface-card': 'oklch(1 0 0 / 0.08)' /* card_bg dark */,
    'border-card': 'transparent' /* adw cards are borderless */,
    'shadow-card': 'none',

    'button-bg': 'color-mix(in srgb, currentColor 10%, transparent)',
    'button-bg-hover': 'color-mix(in srgb, currentColor 15%, transparent)',
    'button-border': 'transparent',
    'button-border-hover': 'transparent',

    'selection-bg':
      'color-mix(in srgb, currentColor 10%, transparent)' /* neutral row */,
    'selection-fg': 'var(--color-base-content)',

    'font-ui': "'Adwaita Sans', 'Cantarell', 'Inter', system-ui, sans-serif",
    'font-display': "'Adwaita Sans', 'Cantarell', 'Inter', system-ui, sans-serif",

    'backdrop-blur': 'none',
    'glass-inset': 'none',
    'mesh-gradient': 'none',
  },
};
