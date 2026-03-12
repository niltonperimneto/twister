<!-- RGB Lighting editor — glassmorphism accordion + triangle color picker -->
<script lang="ts">
  import type { ProfileDto, LedDto, RgbDto } from '$lib/types';
  import { LED_MODES } from '$lib/types';
  import {
    setLedMode,
    setLedColor,
    setLedBrightness,
    setLedEffectDuration,
  } from '$lib/ipc/commands';
  import { addToast } from '$lib/stores/toast.svelte';
  import { tick } from 'svelte';
  import iro from '@jaames/iro';

  interface Props {
    profile: ProfileDto;
    onUpdated: () => void;
  }

  let { profile, onUpdated }: Props = $props();

  let localLeds: LedDto[] = $state([]);
  let expandedIndex: number | null = $state(null);
  let lastProfilePath = '';

  /* iro.js instance management */
  let pickerEl: HTMLDivElement | null = $state(null);
  let colorPicker: any = null;
  let hexInput: string = $state('');
  let suppressPickerSync = false;

  $effect(() => {
    if (profile.path === lastProfilePath) return;
    lastProfilePath = profile.path;
    localLeds = $state.snapshot(profile.leds) as LedDto[];
  });

  /* Destroy picker whenever the zone changes or component unmounts */
  function destroyPicker() {
    if (colorPicker) {
      try { colorPicker.base.remove(); } catch {}
      colorPicker = null;
    }
  }

  function mountPicker(el: HTMLDivElement, hex: string) {
    el.innerHTML = '';
    colorPicker = (iro.ColorPicker as any)(el, {
      width: 180,
      color: hex,
      layoutDirection: 'vertical',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      handleRadius: 7,
      wheelLightness: true,
      layout: [
        { component: iro.ui.Wheel, options: {} },
      ],
    });
    colorPicker.on('color:change', (color: { hexString: string }) => {
      if (suppressPickerSync) return;
      hexInput = color.hexString.toUpperCase();
      const activeLed = localLeds.find(l => l.index === expandedIndex);
      if (activeLed) debouncedColorWrite(activeLed, color.hexString);
    });
  }

  /* When expanded LED changes, tear down old picker and create a new one */
  $effect(() => {
    // Read expandedIndex to create a dependency
    const idx = expandedIndex;

    // Always destroy the previous instance first
    destroyPicker();

    if (idx === null) return;

    const led = localLeds.find(l => l.index === idx);
    if (!led) return;
    const hex = rgbToHex(led.color);
    hexInput = hex.toUpperCase();

    // Wait for Svelte to render the new accordion body + pickerEl
    tick().then(() => {
      if (pickerEl && expandedIndex === idx) {
        mountPicker(pickerEl, hex);
      }
    });
  });

  /* Cleanup on unmount */
  $effect(() => {
    return () => destroyPicker();
  });

  function rgbToHex(c: RgbDto): string {
    return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex: string): RgbDto {
    const m = hex.replace('#', '');
    return {
      r: parseInt(m.slice(0, 2), 16),
      g: parseInt(m.slice(2, 4), 16),
      b: parseInt(m.slice(4, 6), 16),
    };
  }

  const HEX_RE = /^#?[0-9a-f]{6}$/i;

  function handleHexInput(raw: string) {
    hexInput = raw;
    const normalized = raw.startsWith('#') ? raw : '#' + raw;
    if (!HEX_RE.test(normalized)) return;
    if (colorPicker) {
      suppressPickerSync = true;
      colorPicker.color.hexString = normalized;
      suppressPickerSync = false;
    }
    const activeLed = localLeds.find(l => l.index === expandedIndex);
    if (activeLed) debouncedColorWrite(activeLed, normalized);
  }

  function needsSecondary(mode: number): boolean { return mode === 4 || mode === 6; }
  function needsTertiary(mode: number): boolean { return mode === 6; }
  function needsDuration(mode: number): boolean { return mode >= 2; }

  function toggleZone(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  let colorTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedColorWrite(led: LedDto, hex: string) {
    const rgb = hexToRgb(hex);
    const idx = localLeds.findIndex(l => l.index === led.index);
    if (idx >= 0) localLeds[idx].color = rgb;
    if (colorTimer) clearTimeout(colorTimer);
    colorTimer = setTimeout(async () => {
      try {
        await setLedColor(led.path, rgb.r, rgb.g, rgb.b);
        onUpdated();
      } catch (e) {
        console.error('LED color write failed:', e);
        addToast('LED color write failed');
        if (idx >= 0) localLeds[idx].color = profile.leds[idx]?.color ?? rgb;
      }
    }, 120);
  }

  async function handleModeChange(led: LedDto, mode: number) {
    const idx = localLeds.findIndex(l => l.index === led.index);
    if (idx >= 0) localLeds[idx].mode = mode;
    try {
      await setLedMode(led.path, mode);
      onUpdated();
    } catch (e) { console.error('LED mode write failed:', e); addToast('LED mode write failed'); }
  }

  let brightnessTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedBrightnessWrite(led: LedDto, value: number) {
    const idx = localLeds.findIndex(l => l.index === led.index);
    if (idx >= 0) localLeds[idx].brightness = value;
    if (brightnessTimer) clearTimeout(brightnessTimer);
    brightnessTimer = setTimeout(async () => {
      try {
        await setLedBrightness(led.path, value);
        onUpdated();
      } catch (e) {
        console.error('LED brightness write failed:', e);
        addToast('LED brightness write failed');
        if (idx >= 0) localLeds[idx].brightness = profile.leds[idx]?.brightness ?? value;
      }
    }, 120);
  }

  let durationTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedDurationWrite(led: LedDto, ms: number) {
    const idx = localLeds.findIndex(l => l.index === led.index);
    if (idx >= 0) localLeds[idx].effect_duration = ms;
    if (durationTimer) clearTimeout(durationTimer);
    durationTimer = setTimeout(async () => {
      try {
        await setLedEffectDuration(led.path, ms);
        onUpdated();
      } catch (e) {
        console.error('LED duration write failed:', e);
        addToast('LED duration write failed');
        if (idx >= 0) localLeds[idx].effect_duration = profile.leds[idx]?.effect_duration ?? ms;
      }
    }, 120);
  }
</script>

<div class="flex flex-col gap-2">
  {#if profile.leds.length === 0}
    <p class="text-xs text-base-content/35 italic">No LEDs on this device</p>
  {/if}

  {#each localLeds as led, i (led.index)}
    {@const sourceLed = profile.leds[i]}
    {@const hex = rgbToHex(led.color)}
    {@const isOpen = expandedIndex === led.index}

    <!-- Accordion zone -->
    <div class="led-zone {isOpen ? 'led-zone-open' : ''}">
      <!-- Header (always visible) -->
      <button
        onclick={() => toggleZone(led.index)}
        class="led-zone-header"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-3 h-3 rounded-full shrink-0"
            style="background: {hex}; box-shadow: 0 0 8px {hex}50;"
          ></div>
          <span class="text-sm font-medium">LED {led.index}</span>
          <span class="text-[10px] text-base-content/35 font-mono">{LED_MODES[led.mode] ?? 'Unknown'}</span>
        </div>
        <svg
          class="w-3.5 h-3.5 opacity-40 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        ><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      <!-- Expanded panel -->
      {#if isOpen}
        <div class="led-zone-body">
          <!-- Mode selector (pill toggles) -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold">Mode</span>
            <div class="pill-group">
              {#each led.modes as modeId (modeId)}
                <button
                  class="pill-btn {led.mode === modeId ? 'pill-btn-active' : ''}"
                  onclick={() => handleModeChange(sourceLed, modeId)}
                >
                  {LED_MODES[modeId] ?? `Mode ${modeId}`}
                </button>
              {/each}
            </div>
          </div>

          <!-- Color picker + HEX input -->
          {#if led.mode !== 0}
            <div class="flex flex-col gap-4">
              <span class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold">Color</span>

              <div class="flex gap-5 items-start">
                <!-- Triangle wheel -->
                <div class="led-picker-wrapper">
                  <div bind:this={pickerEl}></div>
                </div>

                <!-- HEX + secondary/tertiary stack -->
                <div class="flex flex-col gap-3 flex-1 min-w-0">
                  <!-- HEX input -->
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-base-content/30">HEX</span>
                    <div class="led-hex-field">
                      <span class="text-base-content/25 text-xs select-none">#</span>
                      <input
                        type="text"
                        maxlength="7"
                        value={hexInput.replace('#', '')}
                        oninput={(e) => handleHexInput(e.currentTarget.value)}
                        spellcheck="false"
                        class="led-hex-input"
                      />
                      <div
                        class="w-5 h-5 rounded shrink-0"
                        style="background: {hex}; box-shadow: 0 0 6px {hex}30;"
                      ></div>
                    </div>
                  </div>

                  <!-- Secondary color (read-only) -->
                  {#if needsSecondary(led.mode)}
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-base-content/30 w-6">2nd</span>
                      <div
                        class="w-4 h-4 rounded border border-white/[0.06]"
                        style="background: {rgbToHex(led.secondary_color)};"
                      ></div>
                      <span class="text-[10px] font-mono text-base-content/25">{rgbToHex(led.secondary_color).toUpperCase()}</span>
                    </div>
                  {/if}

                  <!-- Tertiary color (read-only) -->
                  {#if needsTertiary(led.mode)}
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-base-content/30 w-6">3rd</span>
                      <div
                        class="w-4 h-4 rounded border border-white/[0.06]"
                        style="background: {rgbToHex(led.tertiary_color)};"
                      ></div>
                      <span class="text-[10px] font-mono text-base-content/25">{rgbToHex(led.tertiary_color).toUpperCase()}</span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Brightness -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold">Brightness</span>
                <span class="text-xs font-mono text-base-content/35 tabular-nums">{Math.round(led.brightness / 255 * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="255" step="1"
                value={led.brightness}
                oninput={(e) => debouncedBrightnessWrite(sourceLed, Number(e.currentTarget.value))}
                class="led-range"
              />
            </div>
          {/if}

          <!-- Duration -->
          {#if needsDuration(led.mode)}
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold">Effect Speed</span>
                <span class="text-xs font-mono text-base-content/35 tabular-nums">{led.effect_duration}ms</span>
              </div>
              <input
                type="range" min="0" max="10000" step="100"
                value={led.effect_duration}
                oninput={(e) => debouncedDurationWrite(sourceLed, Number(e.currentTarget.value))}
                class="led-range led-range-secondary"
              />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>
