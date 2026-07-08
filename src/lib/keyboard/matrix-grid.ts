/* Matrix-grid fallback renderer.
 *
 * When no VIA definition matches a keyboard (or clackd cannot yet report its
 * VID/PID), we still want remapping to work. This synthesises a plain
 * rows x cols grid of uniform 1u keys straight from `GetDeviceInfo`, feeding
 * the same `KeyboardRenderModel` the pretty VIA layout produces. Every matrix
 * slot is shown, including ones the physical board may not populate. */

import type { KeyboardRenderModel, RenderKey } from './model';
import { labelForByte } from '$lib/keycodes';

export function buildMatrixGrid(
  rows: number,
  cols: number,
  layerKeymap: number[],
  fallback?: (row: number, col: number) => number,
): KeyboardRenderModel {
  const keys: RenderKey[] = [];
  const keySize = 48; // Visual size for fallback grid squares
  const padding = 8;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let keycode = layerKeymap[r * cols + c] ?? 0;
      if ((keycode === 0 || keycode === 65535) && fallback) {
        keycode = fallback(r, c) ?? 0;
      }
      keys.push({
        x: c,
        y: r,
        w: 1,
        h: 1,
        r: 0,
        rx: 0,
        ry: 0,
        row: r,
        col: c,
        keycode,
        label: labelForByte(keycode),
      });
    }
  }
  return { keys, width: cols, height: rows, matched: false };
}
