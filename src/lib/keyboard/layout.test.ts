import { describe, it, expect } from 'vitest';
import { buildMatrixGrid } from './matrix-grid';
import { buildViaLayout } from './layout';
import type { ViaDefinition } from './definitions';
import { matchDefinition } from './definitions';

describe('buildMatrixGrid', () => {
  it('produces rows*cols uniform keys in row-major order', () => {
    // 2x3 grid, keymap values = byte at each slot
    const keymap = [0x04, 0x05, 0x06, 0x07, 0x08, 0x09];
    const model = buildMatrixGrid(2, 3, keymap);

    expect(model.matched).toBe(false);
    expect(model.width).toBe(3);
    expect(model.height).toBe(2);
    expect(model.keys).toHaveLength(6);

    const k = model.keys[4]; // row 1, col 1 -> index 1*3+1 = 4
    expect(k).toMatchObject({ row: 1, col: 1, x: 1, y: 1, w: 1, h: 1, keycode: 0x08 });
    expect(k.label).toBe('E'); // HID 0x08 == KC_E
  });

  it('defaults missing keymap slots to keycode 0', () => {
    const model = buildMatrixGrid(1, 2, []);
    expect(model.keys.map((k) => k.keycode)).toEqual([0, 0]);
  });
});

describe('buildViaLayout', () => {
  // Minimal stand-in for a transformed VIA definition: only the fields
  // buildViaLayout reads (matrix.cols, layouts.{keys,width,height}).
  const def = {
    matrix: { rows: 1, cols: 2 },
    layouts: {
      width: 2,
      height: 1,
      keys: [
        { row: 0, col: 0, x: 0, y: 0, w: 1, h: 1, r: 0, rx: 0, ry: 0 },
        { row: 0, col: 1, x: 1, y: 0, w: 1.5, h: 1, r: 0, rx: 0, ry: 0 },
        // a decal (decorative) — must be skipped
        { row: 0, col: 0, x: 0, y: 1, w: 1, h: 1, r: 0, rx: 0, ry: 0, d: true },
      ],
    },
  } as unknown as ViaDefinition;

  it('maps each positioned key to its matrix slot keycode', () => {
    const keymap = [0x04 /* KC_A @ (0,0) */, 0x05 /* KC_B @ (0,1) */];
    const model = buildViaLayout(def, keymap);

    expect(model.matched).toBe(true);
    expect(model.width).toBe(2);
    expect(model.keys).toHaveLength(2); // decal skipped

    expect(model.keys[0]).toMatchObject({ row: 0, col: 0, keycode: 0x04, label: 'A' });
    expect(model.keys[1]).toMatchObject({ row: 0, col: 1, w: 1.5, keycode: 0x05, label: 'B' });
  });
});

describe('matchDefinition', () => {
  it('correctly matches Zuoya GMK67 / Epomaker EK68 definition by vid/pid', () => {
    const def = matchDefinition(0x05AC, 0x024F);
    expect(def).not.toBeNull();
    expect(def?.name).toBe('Zuoya GMK67 / Epomaker EK68');
  });

  it('correctly matches Akko 5075 definition by vid/pid', () => {
    const def = matchDefinition(0xFFFE, 0x000B);
    expect(def).not.toBeNull();
    expect(def?.name).toBe('AKKO Keyboard');
  });

  it('successfully builds layout model for Akko 5075', () => {
    const def = matchDefinition(0xFFFE, 0x000B);
    expect(def).not.toBeNull();
    const keymap = new Array(def!.matrix.rows * def!.matrix.cols).fill(0);
    const model = buildViaLayout(def!, keymap);
    expect(model.matched).toBe(true);
    expect(model.keys.length).toBe(83); // Akko 5075 has 83 active keys
  });
});
