/* Theme registry — see README.md in this directory for how to add
 * a theme. The picker UI and the theme store both iterate this map,
 * so registering a theme here is the only wiring step. */

import type { Theme, ThemeId } from './types';
import { aurora } from './aurora';
import { breeze } from './breeze';
import { libadwaita } from './libadwaita';
import { cosmic } from './cosmic';

/** The house theme — DE-agnostic fallback when the desktop is unknown. */
export const DEFAULT_THEME_ID: ThemeId = 'aurora';

export const themes: Readonly<Record<ThemeId, Theme>> = {
  aurora,
  breeze,
  libadwaita,
  cosmic,
};

/** Registry as an array, in picker display order. */
export const themeList: Theme[] = Object.values(themes);

export * from './types';
