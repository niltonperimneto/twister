import type { Theme } from './types';

/* Aurora — Twister's original house look, preserved from before the
 * theme engine: Dracula-blue accent over hue-265 charcoal, pill
 * buttons, full glassmorphism, and the animated mesh-gradient "living
 * light" background. Token values mirror the pre-init :root fallbacks
 * in app.css. Uses the built-in Lucide-style icon set (no `icons`
 * field) — the app's original iconography. */

export const aurora: Theme = {
  id: 'aurora',
  name: 'Aurora',
  description: 'The original Twister look — Dracula-blue glassmorphism',
  appearance: 'dark',
  style: 'glass',
  tokens: {
    'color-primary': 'oklch(0.74 0.16 248)',
    'color-primary-content': 'oklch(0.98 0.02 248)',
    'color-secondary': 'oklch(0.7 0.15 330)',
    'color-secondary-content': 'oklch(0.98 0.02 330)',
    'color-base-100': 'oklch(0.17 0.015 265)',
    'color-base-200': 'oklch(0.15 0.015 265)',
    'color-base-300': 'oklch(0.13 0.015 265)',
    'color-base-content': 'oklch(0.92 0 0)',
    'color-info': 'oklch(0.7 0.1 230)',
    'color-success': 'oklch(0.7 0.15 160)',
    'color-warning': 'oklch(0.75 0.15 80)',
    'color-error': 'oklch(0.65 0.2 25)',

    'radius-xs': '4px',
    'radius-sm': '6px',
    'radius-md': '8px',
    'radius-lg': '12px',
    'radius-full': '9999px',
    'radius-button': '9999px',

    'surface-base': 'oklch(0.15 0.02 265)',
    'surface-picker': 'oklch(0.18 0.015 265 / 0.5)',

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

    'backdrop-blur': 'blur(20px) saturate(1.4)',
    'glass-inset': 'inset 0 1px 0 0 oklch(1 0 0 / 0.08)',

    'mesh-gradient': [
      'radial-gradient(ellipse 80% 60% at 15% 20%, oklch(0.24 0.06 280 / 0.7), transparent)',
      'radial-gradient(ellipse 60% 80% at 85% 30%, oklch(0.22 0.05 320 / 0.5), transparent)',
      'radial-gradient(ellipse 70% 50% at 50% 80%, oklch(0.21 0.055 250 / 0.6), transparent)',
      'radial-gradient(ellipse 90% 70% at 30% 60%, oklch(0.20 0.04 200 / 0.4), transparent)',
      'radial-gradient(ellipse 50% 90% at 70% 70%, oklch(0.23 0.045 290 / 0.35), transparent)',
    ].join(', '),
  },
};
