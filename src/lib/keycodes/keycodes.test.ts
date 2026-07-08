import { describe, it, expect } from 'vitest';
import { byteForCode, codeForByte, labelForByte, basicKeyToByte } from './index';

describe('keycode mapping', () => {
  it('maps basic HID keycodes to their canonical bytes', () => {
    expect(byteForCode('KC_A')).toBe(0x04);
    expect(byteForCode('KC_NO')).toBe(0x00);
    expect(byteForCode('KC_ESC')).toBe(0x29);
    expect(byteForCode('KC_LCTL')).toBe(0xe0);
  });

  it('round-trips basic codes (code -> byte -> code)', () => {
    for (const code of ['KC_A', 'KC_Z', 'KC_1', 'KC_ENT', 'KC_SPC', 'KC_F12', 'KC_RGUI']) {
      const byte = byteForCode(code);
      expect(byte, `byte for ${code}`).toBeTypeOf('number');
      expect(codeForByte(byte as number)).toBe(code);
    }
  });

  it('round-trips every basic byte in the v12 table (byte -> code -> byte)', () => {
    // Several codes alias the same byte (e.g. KC_ENT / KC_ENTER), so the
    // code direction is not 1:1. The byte direction is the stable invariant:
    // decoding a byte then re-encoding the result must return the same byte.
    for (const [code, byte] of Object.entries(basicKeyToByte)) {
      if (code.startsWith('_')) continue; // _QK_* range markers, not real keys
      expect(byteForCode(codeForByte(byte)), `round-trip byte 0x${byte.toString(16)}`).toBe(byte);
    }
  });

  it('encodes and decodes layer keycodes', () => {
    const mo1 = byteForCode('MO(1)');
    expect(mo1, 'MO(1) encodes').toBeTypeOf('number');
    expect(codeForByte(mo1 as number)).toBe('MO(1)');

    for (const code of ['TG(2)', 'TO(0)', 'DF(3)', 'OSL(4)', 'TT(1)']) {
      const byte = byteForCode(code);
      expect(byte, `${code} encodes`).toBeTypeOf('number');
      expect(codeForByte(byte as number)).toBe(code);
    }
  });

  it('produces a human label for a keycode byte', () => {
    expect(labelForByte(0x04)).toBe('A');
    // unknown/unmapped bytes fall back to hex
    expect(labelForByte(0xfffe)).toMatch(/^0x/i);
  });

  it('never throws on malformed code strings (VIA maps them to KC_NO or undefined)', () => {
    expect(() => byteForCode('NOT_A_REAL_KEYCODE')).not.toThrow();
    const v = byteForCode('NOT_A_REAL_KEYCODE');
    expect(v === undefined || v === 0).toBe(true);
  });
});
