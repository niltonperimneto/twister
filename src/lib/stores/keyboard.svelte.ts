/* Global reactive keyboard store — Svelte 5 Runes class singleton.
 *
 * Sibling to deviceStore (mice). Owns the clackd connection state, the list of
 * connected keyboards, the active keyboard and layer, and the keymap. It talks
 * to the clackd-backed Tauri commands and mirrors deviceStore's lifecycle
 * (connect → list → prefetch → subscribe to a resync event).
 *
 * Two clackd-specific concerns shape this store:
 *  - Lazy layers: get_keyboard loads only layer 0; other layers are pulled on
 *    first switch (each keymap read is rows*cols live D-Bus round-trips).
 *  - Write debouncing: every set_keycode writes EEPROM immediately, so edits
 *    update local state optimistically and the actual write is debounced
 *    per (layer,row,col) slot. */

import {
  connectClackd,
  listKeyboards,
  getKeyboard,
  getKeymap,
  setKeycode,
  commitKeyboard,
  getKeyboardLighting,
  setKeyboardLighting,
} from '$lib/ipc/commands';
import { listen } from '@tauri-apps/api/event';
import type { ClackdStatus, KeyboardSummary, KeyboardDeviceDto } from '$lib/types';
import { addToast } from '$lib/stores/toast.svelte';

const WRITE_DEBOUNCE_MS = 500;

class KeyboardStore {
  clackdStatus: ClackdStatus = $state({ status: 'disconnected', reason: 'Not initialised' });
  keyboards: KeyboardSummary[] = $state([]);
  activeKeyboardId: string | null = $state(null);
  activeKeyboard: KeyboardDeviceDto | null = $state(null);
  activeLayer: number = $state(0);
  loading: boolean = $state(false);
  error: string | null = $state(null);

  /* Device lighting state `[mode, r, g, b, brightness, random, speed, direction]` */
  lighting: number[] | null = $state([1, 255, 255, 255, 15, 0, 8, 0]);
  /* Detected lighting channel (3 = RGB Matrix, 2 = RGBLIGHT, 1 = Backlight, 0 = fallback) */
  lightingChannel: number | null = null;
  /* Whether the active keyboard's lighting can actually be driven. False when a
   * native VIA board exposes no readable custom channel (e.g. a `qmk_rgblight`
   * board clackd can't yet drive) — the UI shows an inline notice instead of
   * controls. */
  lightingSupported: boolean = $state(true);

  /* Lighting wire protocol for the active keyboard, derived from the
   * driver-reported model. clackd's native VIA fallback driver reports
   * "VIA keyboard" and speaks the custom-channel (RGB-Matrix) protocol; legacy
   * polyfill drivers report a bespoke model and use the single channel-0 blob.
   * See KeyboardDeviceDto.model. */
  readonly lightingProtocol: 'via' | 'legacy' = $derived(
    this.activeKeyboard?.model === 'VIA keyboard' ? 'via' : 'legacy',
  );

  private unlistenResync: (() => void) | null = null;
  /* Debounce timers keyed by `${layer}:${row}:${col}`. */
  private writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /* Latest un-flushed value per slot, so commit() can flush exactly the
   * pending edits rather than re-writing the whole layer. */
  private pendingWrites = new Map<string, { layer: number; row: number; col: number; keycode: number }>();

  readonly isConnected: boolean = $derived(this.clackdStatus.status === 'connected');

  /* Row-major keymap for the layer currently shown, or [] if not yet loaded. */
  readonly activeLayerKeymap: number[] = $derived(
    this.activeKeyboard?.keymap[this.activeLayer] ?? [],
  );

  async init(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const status = await connectClackd();
      this.clackdStatus = status;

      if (status.status === 'connected') {
        /* Keyboards enumerate quickly; a single short retry is plenty. */
        let list = await listKeyboards();
        if (list.length === 0) {
          await new Promise((r) => setTimeout(r, 800));
          list = await listKeyboards();
        }
        this.keyboards = list;

        if (list.length > 0) {
          this.activeKeyboardId = list[0].id;
          this.activeKeyboard = await getKeyboard(list[0].id);
          this.activeLayer = 0;
          await this.fetchLighting(list[0].id);
        }
      }
    } catch (e) {
      console.error('[twister] keyboard init() error:', e);
      this.error = String(e);
      this.clackdStatus = { status: 'disconnected', reason: String(e) };
    } finally {
      this.loading = false;
    }

    if (this.isConnected && !this.unlistenResync) {
      listen('clack:resync', () => {
        this.refresh();
      })
        .then((unlisten) => {
          this.unlistenResync = unlisten;
        })
        .catch((e) => {
          console.error('[twister] Failed to subscribe to clack:resync:', e);
        });
    }
  }

  async refresh(): Promise<void> {
    if (!this.isConnected) return;
    try {
      this.keyboards = await listKeyboards();
      /* If the active keyboard vanished, drop the selection. */
      if (this.activeKeyboardId && !this.keyboards.some((k) => k.id === this.activeKeyboardId)) {
        this.activeKeyboardId = this.keyboards[0]?.id ?? null;
        this.activeKeyboard = null;
        this.activeLayer = 0;
      }
      if (this.activeKeyboardId && !this.activeKeyboard) {
        this.activeKeyboard = await getKeyboard(this.activeKeyboardId);
        await this.fetchLighting(this.activeKeyboardId);
      }
    } catch (e) {
      this.error = String(e);
    }
  }

  async selectKeyboard(id: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.activeKeyboardId = id;
      this.activeKeyboard = await getKeyboard(id);
      this.activeLayer = 0;
      await this.fetchLighting(id);
    } catch (e) {
      console.error('[twister] selectKeyboard error:', e);
      this.error = String(e);
      this.activeKeyboard = null;
    } finally {
      this.loading = false;
    }
  }

  async selectLayer(layer: number): Promise<void> {
    const kb = this.activeKeyboard;
    if (!kb || layer < 0 || layer >= kb.layers) return;
    /* Lazily fetch a layer the first time it is viewed. */
    if ((kb.keymap[layer]?.length ?? 0) === 0) {
      try {
        const map = await getKeymap(kb.id, layer);
        kb.keymap[layer] = map;
      } catch (e) {
        this.error = String(e);
      }
    }
    this.activeLayer = layer;
  }

  /* Optimistically set a key and debounce the hardware write per slot. */
  setKey(row: number, col: number, keycode: number): void {
    const kb = this.activeKeyboard;
    if (!kb) return;
    const idx = row * kb.cols + col;
    const layerMap = kb.keymap[this.activeLayer];
    if (!layerMap) return;
    layerMap[idx] = keycode;

    const id = kb.id;
    const layer = this.activeLayer;
    const slot = `${layer}:${row}:${col}`;
    this.pendingWrites.set(slot, { layer, row, col, keycode });

    const existing = this.writeTimers.get(slot);
    if (existing) clearTimeout(existing);
    this.writeTimers.set(
      slot,
      setTimeout(() => {
        this.writeTimers.delete(slot);
        this.pendingWrites.delete(slot);
        setKeycode(id, layer, row, col, keycode).catch((e) => {
          this.error = String(e);
        });
      }, WRITE_DEBOUNCE_MS),
    );
  }

  /* Flush exactly the pending (un-debounced) writes, then commit to NVRAM. */
  async commit(): Promise<void> {
    const kb = this.activeKeyboard;
    if (!kb || !this.activeKeyboardId) throw new Error('No keyboard selected');

    for (const timer of this.writeTimers.values()) clearTimeout(timer);
    this.writeTimers.clear();
    const pending = [...this.pendingWrites.values()];
    this.pendingWrites.clear();

    for (const w of pending) {
      await setKeycode(kb.id, w.layer, w.row, w.col, w.keycode);
    }
    await commitKeyboard(this.activeKeyboardId);
  }

  async fetchLighting(id: string): Promise<void> {
    this.lightingSupported = true;
    try {
      // Legacy polyfill drivers (e.g. the Epomaker EK68 / Zuoya GMK67) ignore
      // channel/value_id and use a single 8-byte blob
      // `[mode,r,g,b,brightness,random,speed,direction]` on channel 0 / value 0.
      // Reading any per-channel value would just echo that same blob, so don't
      // probe — read the blob directly.
      if (this.lightingProtocol === 'legacy') {
        this.lightingChannel = 0;
        this.lighting = await getKeyboardLighting(id, 0, 0);
        return;
      }

      // Native VIA: find a readable custom channel (3=RGB Matrix, 2=RGBLIGHT,
      // 1=Backlight) by reading the brightness value (value_id 1). The driver is
      // known-VIA here, so the legacy-blob false-positive can't occur — accept
      // the first channel that returns a response and default to channel 3.
      let channel = 0;
      for (const ch of [3, 2, 1]) {
        try {
          const testVal = await getKeyboardLighting(id, ch, 1);
          if (testVal && testVal.length >= 1) {
            channel = ch;
            break;
          }
        } catch (e) {
          // Ignore probe errors on unsupported channels
        }
      }
      this.lightingChannel = channel;

      if (channel === 0) {
        // VIA board with no readable custom channel (e.g. a qmk_rgblight board
        // clackd's RGB-Matrix-only driver can't drive). Surface a notice.
        this.lightingSupported = false;
        this.lighting = [1, 255, 255, 255, 15, 0, 8, 0];
        return;
      }

      // Fetch individual configuration values.
      const modeData = await getKeyboardLighting(id, channel, 2);
      const brightnessData = await getKeyboardLighting(id, channel, 1);
      const speedData = await getKeyboardLighting(id, channel, 3);
      const colorData = await getKeyboardLighting(id, channel, 4);

      const mode = modeData[0] ?? 1;
      const brightnessHw = brightnessData[0] ?? 255;
      const speedHw = speedData[0] ?? 128;
      const hue = colorData[0] ?? 0;
      const sat = colorData[1] ?? 255;

      // Scale brightness and speed from 0-255 back to the UI's 0-15 range
      const brightness = Math.round((brightnessHw * 15) / 255);
      const speed = Math.round((speedHw * 15) / 255);

      // Convert HSV back to RGB for Svelte UI
      const [r, g, b] = hsvToRgb(hue, sat, brightnessHw);
      this.lighting = [mode, r, g, b, brightness, 0, speed, 0];
    } catch (e) {
      console.warn('[twister] failed to fetch lighting, falling back to default:', e);
      this.lighting = [1, 255, 255, 255, 15, 0, 8, 0];
      addToast(`Failed to fetch lighting: ${e}`, 'error');
    }
  }

  async updateLighting(data: number[]): Promise<void> {
    if (!this.activeKeyboardId || !this.lightingSupported) return;
    const old = this.lighting;
    try {
      this.lighting = data;
      const channel = this.lightingChannel;

      if (channel && channel > 0) {
        // If there is no previous lighting state, set everything
        if (!old) {
          const [hue, sat] = rgbToHsv(data[1], data[2], data[3]);
          const brightnessHw = Math.round((data[4] * 255) / 15);
          const speedHw = Math.round((data[6] * 255) / 15);

          await setKeyboardLighting(this.activeKeyboardId, channel, 2, [data[0]]);
          await setKeyboardLighting(this.activeKeyboardId, channel, 1, [brightnessHw]);
          await setKeyboardLighting(this.activeKeyboardId, channel, 3, [speedHw]);
          await setKeyboardLighting(this.activeKeyboardId, channel, 4, [hue, sat]);
          return;
        }

        // Optimize: compare and write only the specific values that changed
        if (data[0] !== old[0]) {
          await setKeyboardLighting(this.activeKeyboardId, channel, 2, [data[0]]);
        }
        if (data[4] !== old[4]) {
          const brightnessHw = Math.round((data[4] * 255) / 15);
          await setKeyboardLighting(this.activeKeyboardId, channel, 1, [brightnessHw]);
        }
        if (data[6] !== old[6]) {
          const speedHw = Math.round((data[6] * 255) / 15);
          await setKeyboardLighting(this.activeKeyboardId, channel, 3, [speedHw]);
        }
        if (data[1] !== old[1] || data[2] !== old[2] || data[3] !== old[3]) {
          const [hue, sat] = rgbToHsv(data[1], data[2], data[3]);
          await setKeyboardLighting(this.activeKeyboardId, channel, 4, [hue, sat]);
        }
      } else {
        // Legacy/fallback: channel 0, value_id 0
        await setKeyboardLighting(this.activeKeyboardId, 0, 0, data);
      }
    } catch (e) {
      console.error('[twister] updateLighting error:', e);
      this.error = String(e);
      addToast(`Failed to set lighting: ${e}`, 'error');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lighting Color Space Conversion Helpers                            */
/* ------------------------------------------------------------------ */

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hNorm = (h / 255) * 360;
  const sNorm = s / 255;
  const vNorm = v / 255;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = vNorm - c;

  let rNorm = 0, gNorm = 0, bNorm = 0;
  if (hNorm >= 0 && hNorm < 60) {
    [rNorm, gNorm, bNorm] = [c, x, 0];
  } else if (hNorm >= 60 && hNorm < 120) {
    [rNorm, gNorm, bNorm] = [x, c, 0];
  } else if (hNorm >= 120 && hNorm < 180) {
    [rNorm, gNorm, bNorm] = [0, c, x];
  } else if (hNorm >= 180 && hNorm < 240) {
    [rNorm, gNorm, bNorm] = [0, x, c];
  } else if (hNorm >= 240 && hNorm < 300) {
    [rNorm, gNorm, bNorm] = [x, 0, c];
  } else if (hNorm >= 300 && hNorm < 360) {
    [rNorm, gNorm, bNorm] = [c, 0, x];
  }

  const r = Math.round((rNorm + m) * 255);
  const g = Math.round((gNorm + m) * 255);
  const b = Math.round((bNorm + m) * 255);
  return [r, g, b];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let hNorm = 0;
  if (delta === 0) {
    hNorm = 0;
  } else if (max === rNorm) {
    hNorm = ((gNorm - bNorm) / delta) % 6;
  } else if (max === gNorm) {
    hNorm = (bNorm - rNorm) / delta + 2;
  } else if (max === bNorm) {
    hNorm = (rNorm - gNorm) / delta + 4;
  }

  let h = Math.round((hNorm * 60 + 360) % 360);
  h = Math.round((h / 360) * 255);

  const s = max === 0 ? 0 : Math.round((delta / max) * 255);
  const v = Math.round(max * 255);

  return [h, s, v];
}

export const keyboardStore = new KeyboardStore();
