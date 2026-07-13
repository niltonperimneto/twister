import type { Theme } from './types';

/* KDE Breeze Dark — Plasma blue accent over cool charcoal grays,
 * compact radii, full glassmorphism (KDE is where blur shines). */

export const breeze: Theme = {
  id: 'breeze',
  name: 'Breeze',
  description: 'KDE Plasma blue on cool charcoal, compact corners, full glass',
  appearance: 'dark',
  tokens: {
    'color-primary': 'oklch(0.71 0.13 235)' /* Plasma #3daee9 */,
    'color-primary-content': 'oklch(0.98 0.02 235)',
    'color-secondary': 'oklch(0.65 0.12 300)',
    'color-secondary-content': 'oklch(0.98 0.02 300)',
    'color-base-100': 'oklch(0.22 0.01 250)' /* #232629 family */,
    'color-base-200': 'oklch(0.19 0.01 250)',
    'color-base-300': 'oklch(0.16 0.01 250)',
    'color-base-content': 'oklch(0.93 0.005 250)',
    'color-info': 'oklch(0.7 0.1 230)',
    'color-success': 'oklch(0.7 0.14 145)' /* #27ae60 family */,
    'color-warning': 'oklch(0.76 0.14 85)' /* #fdbc4b family */,
    'color-error': 'oklch(0.6 0.19 20)' /* #da4453 family */,

    'radius-xs': '3px',
    'radius-sm': '4px',
    'radius-md': '5px',
    'radius-lg': '6px',
    'radius-full': '9999px',

    'surface-base': 'oklch(0.18 0.012 250)',
    'surface-picker': 'oklch(0.21 0.012 250 / 0.5)',

    'backdrop-blur': 'blur(20px) saturate(1.4)',
    'glass-inset': 'inset 0 1px 0 0 oklch(1 0 0 / 0.08)',

    'mesh-gradient': [
      'radial-gradient(ellipse 80% 60% at 15% 20%, oklch(0.24 0.05 245 / 0.7), transparent)',
      'radial-gradient(ellipse 60% 80% at 85% 30%, oklch(0.22 0.05 220 / 0.5), transparent)',
      'radial-gradient(ellipse 70% 50% at 50% 80%, oklch(0.21 0.055 250 / 0.6), transparent)',
      'radial-gradient(ellipse 90% 70% at 30% 60%, oklch(0.20 0.04 200 / 0.4), transparent)',
      'radial-gradient(ellipse 50% 90% at 70% 70%, oklch(0.23 0.045 235 / 0.35), transparent)',
    ].join(', '),
  },
};
