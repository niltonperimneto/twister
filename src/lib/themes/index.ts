/* Theme registry — see README.md in this directory for how to add
 * a theme. The picker UI and the theme store both iterate this map,
 * so registering a theme here is the only wiring step. */

import type { Theme, ThemeId } from './types';
import { breeze } from './breeze';
import { libadwaita } from './libadwaita';
import { cosmic } from './cosmic';

/** Neutral, flat fallback when the desktop environment is unknown. */
export const DEFAULT_THEME_ID: ThemeId = 'libadwaita';

export const themes: Readonly<Record<ThemeId, Theme>> = {
  breeze,
  libadwaita,
  cosmic,
};

/** Registry as an array, in picker display order. */
export const themeList: Theme[] = Object.values(themes);

export * from './types';
