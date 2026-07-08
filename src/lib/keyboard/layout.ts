/* Build a KeyboardRenderModel from a matched VIA definition + a layer's keymap.
 *
 * @the-via/reader has already converted the definition's KLE into positioned
 * keys (absolute x/y/w/h + rotation r/rx/ry, plus the matrix row/col). We just
 * attach the live keycode for each key's matrix slot and a display label, so
 * KeyboardLayout.svelte renders the true physical layout. Falls back to the
 * matrix grid (see matrix-grid.ts) when no definition matches. */

import type { KeyboardRenderModel, RenderKey } from './model';
import type { ViaDefinition } from './definitions';
import { labelForByte } from '$lib/keycodes';

export function buildViaLayout(
  def: ViaDefinition,
  layerKeymap: number[],
  fallback?: (row: number, col: number) => number,
): KeyboardRenderModel {
  const cols = def.matrix.cols;
  const keys: RenderKey[] = [];

  for (const key of def.layouts.keys) {
    /* Decals are decorative (e.g. encoders, logos) — no matrix slot. */
    if ((key as { d?: boolean }).d) continue;

    let keycode = layerKeymap[key.row * cols + key.col] ?? 0;
    if ((keycode === 0 || keycode === 65535) && fallback) {
        keycode = fallback(key.row, key.col) ?? 0;
    }

    keys.push({
      x: key.x,
      y: key.y,
      w: key.w,
      h: key.h,
      r: key.r ?? 0,
      rx: key.rx ?? 0,
      ry: key.ry ?? 0,
      row: key.row,
      col: key.col,
      keycode,
      label: labelForByte(keycode),
    });
  }

  return {
    keys,
    width: def.layouts.width,
    height: def.layouts.height,
    matched: true,
  };
}
