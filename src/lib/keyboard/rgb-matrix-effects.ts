/* SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Standard QMK RGB-Matrix effect catalogue, vendored from @the-via/reader
 * (`dist/common-menus/qmk_rgb_matrix.js`, GPL-3.0). That menu is the
 * authoritative VIA mapping for the RGB-Matrix custom channel (channel 3):
 *   - Effect    -> [channel 3, value_id 2], index into this list
 *   - Brightness-> [channel 3, value_id 1]
 *   - Speed     -> [channel 3, value_id 3]
 *   - Color     -> [channel 3, value_id 4] (hue, sat)
 *
 * It is not re-exported from the package root, so we vendor the data here —
 * the same approach the project already uses for the VIA keycode tables under
 * `src/lib/keycodes`.
 *
 * Credit: the-via/app and @the-via/reader (https://github.com/the-via). */

/* Effect names, index == the firmware effect id written to (channel 3, value 2). */
export const RGB_MATRIX_EFFECTS: readonly string[] = [
  'All Off',
  'Solid Color',
  'Alphas Mods',
  'Gradient Up/Down',
  'Gradient Left/Right',
  'Breathing',
  'Band Sat.',
  'Band Val.',
  'Pinwheel Sat.',
  'Pinwheel Val.',
  'Spiral Sat.',
  'Spiral Val.',
  'Cycle All',
  'Cycle Left/Right',
  'Cycle Up/Down',
  'Rainbow Moving Chevron',
  'Cycle Out/In',
  'Cycle Out/In Dual',
  'Cycle Pinwheel',
  'Cycle Spiral',
  'Dual Beacon',
  'Rainbow Beacon',
  'Rainbow Pinwheels',
  'Raindrops',
  'Jellybean Raindrops',
  'Hue Breathing',
  'Hue Pendulum',
  'Hue Wave',
  'Pixel Rain',
  'Pixel Flow',
  'Pixel Fractal',
  'Typing Heatmap',
  'Digital Rain',
  'Solid Reactive Simple',
  'Solid Reactive',
  'Solid Reactive Wide',
  'Solid Reactive Multi Wide',
  'Solid Reactive Cross',
  'Solid Reactive Multi Cross',
  'Solid Reactive Nexus',
  'Solid Reactive Multi Nexus',
  'Splash',
  'Multi Splash',
  'Solid Splash',
  'Solid Multi Splash',
];

/* Effect 0 ("All Off") is the only effect with no speed (mirrors the menu's
 * `showIf: {effect} != 0`). */
export function rgbMatrixEffectHasSpeed(effect: number): boolean {
  return effect !== 0;
}

/* Effects that ignore the base colour because they animate their own hue.
 * Mirrors the menu's Color `showIf`:
 *   {effect} != 0 && != 24 && != 28 && != 29 && != 32
 * i.e. All Off, Jellybean Raindrops, Pixel Rain, Pixel Flow, Digital Rain. */
const RGB_MATRIX_NO_COLOR = new Set([0, 24, 28, 29, 32]);

export function rgbMatrixEffectHasColor(effect: number): boolean {
  return !RGB_MATRIX_NO_COLOR.has(effect);
}
