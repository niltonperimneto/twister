import type { Theme } from './types';

/* System76 COSMIC Dark — teal-cyan accent over near-black neutrals,
 * signature big roundness, subtle glass with a dim teal mesh. */

export const cosmic: Theme = {
  id: 'cosmic',
  name: 'Cosmic',
  description: 'COSMIC teal on near-black, very round corners, subtle glass',
  appearance: 'dark',
  style: 'glass',
  icons: 'cosmic',
  tokens: {
    'color-primary': 'oklch(0.78 0.09 210)' /* COSMIC light cyan accent */,
    'color-primary-content': 'oklch(0.2 0.03 210)',
    'color-secondary': 'oklch(0.75 0.1 60)' /* COSMIC warm orange */,
    'color-secondary-content': 'oklch(0.2 0.03 60)',
    'color-base-100': 'oklch(0.22 0.005 260)',
    'color-base-200': 'oklch(0.18 0.005 260)',
    'color-base-300': 'oklch(0.14 0.005 260)',
    'color-base-content': 'oklch(0.92 0.005 260)',
    'color-info': 'oklch(0.72 0.09 220)',
    'color-success': 'oklch(0.72 0.13 155)',
    'color-warning': 'oklch(0.77 0.13 70)',
    'color-error': 'oklch(0.65 0.18 25)',

    'radius-xs': '8px',
    'radius-sm': '12px',
    'radius-md': '16px',
    'radius-lg': '20px',
    'radius-full': '9999px',
    'radius-button': '9999px',

    'surface-base': 'oklch(0.16 0.006 260)',
    'surface-picker': 'oklch(0.2 0.006 260 / 0.5)',

    'surface-card':
      'linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) 11%, transparent), color-mix(in oklab, var(--color-base-content) 6%, transparent))',
    'border-card': 'oklch(0.4 0 0 / 0.18)',
    'shadow-card':
      'var(--glass-inset), 0 4px 16px oklch(0 0 0 / 0.25), 0 1px 3px oklch(0 0 0 / 0.15)',

    'button-bg':
      'linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) 13%, transparent), color-mix(in oklab, var(--color-base-content) 8%, transparent))',
    'button-bg-hover':
      'color-mix(in oklab, var(--color-base-content) 14%, transparent)',
    'button-border': 'oklch(0.45 0 0 / 0.25)',
    'button-border-hover': 'oklch(0.55 0 0 / 0.4)',

    'selection-bg':
      'linear-gradient(to bottom, color-mix(in oklab, var(--color-primary) 25%, transparent), color-mix(in oklab, var(--color-primary) 15%, transparent))',
    'selection-fg':
      'color-mix(in oklab, var(--color-primary) 25%, var(--color-base-content))',

    'font-ui': "'Inter', system-ui, sans-serif",

    'backdrop-blur': 'blur(12px) saturate(1.2)',
    'glass-inset': 'inset 0 1px 0 0 oklch(1 0 0 / 0.06)',

    'mesh-gradient': [
      'radial-gradient(ellipse 80% 60% at 15% 20%, oklch(0.2 0.03 210 / 0.55), transparent)',
      'radial-gradient(ellipse 60% 80% at 85% 30%, oklch(0.19 0.025 190 / 0.4), transparent)',
      'radial-gradient(ellipse 70% 50% at 50% 80%, oklch(0.18 0.03 230 / 0.45), transparent)',
      'radial-gradient(ellipse 50% 90% at 70% 70%, oklch(0.2 0.02 210 / 0.3), transparent)',
    ].join(', '),
  },
};
