/* Renderer-agnostic keyboard layout model.
 *
 * Both the matrix-grid fallback (Phase 1) and the VIA-definition layout
 * (Phase 2) produce this same shape, so `KeyboardLayout.svelte` is agnostic to
 * where the geometry came from. Coordinates are in *key units* (1u = one
 * standard 1x key); the renderer multiplies by a pixel scale. */

export interface RenderKey {
  /** Top-left x in key units. */
  x: number;
  /** Top-left y in key units. */
  y: number;
  /** Width in key units. */
  w: number;
  /** Height in key units. */
  h: number;
  /** Rotation in degrees (0 for the matrix grid). */
  r: number;
  /** Rotation origin x in key units. */
  rx: number;
  /** Rotation origin y in key units. */
  ry: number;
  /** Matrix row — ties this cap back to a clackd (layer,row,col) slot. */
  row: number;
  /** Matrix column. */
  col: number;
  /** Current raw keycode (from the active layer's keymap). */
  keycode: number;
  /** Cap label derived from the keycode. */
  label: string;
}

export interface KeyboardRenderModel {
  keys: RenderKey[];
  /** Bounding width in key units (for sizing the container). */
  width: number;
  /** Bounding height in key units. */
  height: number;
  /** True when a real VIA definition was used; false for the fallback grid. */
  matched: boolean;
}
