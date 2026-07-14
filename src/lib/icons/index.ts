/* Icon registry. Themed sets are official symbolic icons fetched from
 * each desktop's icon theme (see LICENSES.md); the default set is the
 * complete fallback. Themes opt in via Theme.icons. */

import type { IconSet, IconSetId } from './types';
import { defaultIconSet } from './default';
import { breezeIcons } from './breeze';
import { adwaitaIcons } from './adwaita';
import { cosmicIcons } from './cosmic';

/* Symbolic sets are fill-based monochrome glyphs. */
const symbolicAttrs = { fill: 'currentColor' };

export const iconSets: Record<IconSetId, IconSet> = {
  breeze: { viewBox: '0 0 22 22', attrs: symbolicAttrs, glyphs: breezeIcons },
  adwaita: { viewBox: '0 0 16 16', attrs: symbolicAttrs, glyphs: adwaitaIcons },
  cosmic: { viewBox: '0 0 16 16', attrs: symbolicAttrs, glyphs: cosmicIcons },
};

export { defaultIconSet };
export * from './types';
