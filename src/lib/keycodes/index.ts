/* Public keycode API for Twister, binding the vendored VIA tables to VIA
 * protocol v12 (the encoding modern QMK/VIA boards use, which clackd targets).
 *
 * The vendored helpers (keycodes.ts) take the keycode dictionary as a
 * parameter; this module binds v12 once and exposes ergonomic wrappers so the
 * rest of the app never threads the dict around. Replaces the Phase 1
 * hand-written `basic.ts`. */

import keyToByteV12 from './key-to-byte-v12';
import {
  getKeycodes,
  getByteToKey,
  getByteForCode,
  getCodeForByte,
  getLabelForByte,
  getShortNameForKeycode,
  type IKeycode,
  type IKeycodeMenu,
} from './keycodes';

export type { IKeycode, IKeycodeMenu };
export { getShortNameForKeycode };

export const basicKeyToByte: Record<string, number> = (keyToByteV12 as any).default || keyToByteV12 as Record<string, number>;
export const byteToKey: Record<number, string> = getByteToKey(basicKeyToByte);

/* The full category menu (basic, mods, media, layers, special, …). */
export const keycodeMenus: IKeycodeMenu[] = getKeycodes();

/* Hex fallback for keycodes the tables cannot resolve. */
function hex(byte: number): string {
  return `0x${byte.toString(16).toUpperCase().padStart(4, '0')}`;
}

/* Display label for a raw keycode (cap legend). `size` ≤150 prefers shortName. */
export function labelForByte(byte: number, size = 100): string {
  return getLabelForByte(byte, size, basicKeyToByte, byteToKey) ?? hex(byte);
}

/* Raw keycode → symbolic code string (e.g. 0x04 → "KC_A", 0x5221 → "MO(1)"). */
export function codeForByte(byte: number): string {
  return getCodeForByte(byte, basicKeyToByte, byteToKey) ?? hex(byte);
}

/* Symbolic code string → raw u16, or undefined when unmappable. */
export function byteForCode(code: string): number | undefined {
  try {
    return getByteForCode(code, basicKeyToByte);
  } catch {
    return undefined;
  }
}
