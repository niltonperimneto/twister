<!-- LED lighting editor.
     Modes (with a sensible fallback when the daemon doesn't expose Modes),
     a from-scratch DaisyUI-driven HSL color picker (gradient hue / saturation /
     lightness sliders, hex input, live preview, presets), brightness, and
     effect speed. All edits update local state optimistically and are
     debounced before the daemon round-trip. -->
<script lang="ts">
    import type { ProfileDto, LedDto, RgbDto } from "$lib/types";
    import { LED_MODES } from "$lib/types";
    import {
        setLedMode,
        setLedColor,
        setLedBrightness,
        setLedEffectDuration,
    } from "$lib/ipc/commands";
    import { addToast } from "$lib/stores/toast.svelte";

    interface Props {
        profile: ProfileDto;
        onUpdated: () => void | Promise<void>;
    }
    let { profile, onUpdated }: Props = $props();

    /* -------- local mirror + resync -------------------------------------- */
    let localLeds: LedDto[] = $state([]);
    let expandedIndex: number | null = $state(null);
    /* Suppress prop->local resync while a write is in flight so a drag isn't
       clobbered by the post-write refresh. Otherwise local always tracks the
       daemon's truth (mode / color / brightness / duration). */
    let pending: boolean = $state(false);

    $effect(() => {
        const snap = $state.snapshot(profile.leds) as LedDto[];
        if (pending) return;
        localLeds = snap;
    });

    /* -------- modes ------------------------------------------------------ */
    /* Drivers that don't report a Modes array still have a current Mode, so
       fall back to the canonical set rather than hiding the selector. */
    const DEFAULT_MODES = [0, 1, 2, 3, 4, 5, 6];
    function modesFor(led: LedDto): number[] {
        return led.modes.length > 0 ? led.modes : DEFAULT_MODES;
    }
    function needsSecondary(m: number) { return m === 4 || m === 6; }
    function needsTertiary(m: number) { return m === 6; }
    function needsDuration(m: number) { return m >= 2; }
    function needsColor(m: number) { return m !== 0; }

    /* -------- color math (HSL is the picker's source of truth) ----------- */
    function rgbToHex(c: RgbDto): string {
        return (
            "#" +
            [c.r, c.g, c.b]
                .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
                .join("")
        );
    }
    function hexToRgb(hex: string): RgbDto {
        const m = hex.replace("#", "");
        return {
            r: parseInt(m.slice(0, 2), 16),
            g: parseInt(m.slice(2, 4), 16),
            b: parseInt(m.slice(4, 6), 16),
        };
    }
    function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const ll = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return [Math.round(h), Math.round(s * 100), Math.round(ll * 100)];
    }
    function hslToRgb(h: number, s: number, l: number): RgbDto {
        const S = s / 100, L = l / 100;
        if (S === 0) {
            const v = Math.round(L * 255);
            return { r: v, g: v, b: v };
        }
        const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
        const p = 2 * L - q;
        const hk = ((((h % 360) + 360) % 360)) / 360;
        const conv = (t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        return {
            r: Math.round(conv(hk + 1 / 3) * 255),
            g: Math.round(conv(hk) * 255),
            b: Math.round(conv(hk - 1 / 3) * 255),
        };
    }
    const HEX_RE = /^#?[0-9a-f]{6}$/i;

    /* -------- picker state (kept separate to avoid HSL<->RGB drift) ------ */
    let h: number = $state(0);
    let s: number = $state(100);
    let l: number = $state(50);
    let hexInput: string = $state("");
    /* Canonical lowercase hex of the value we most recently *applied* locally.
       Lets the sync effect ignore the echo of our own writes after a refresh. */
    let lastAppliedHex = "";

    const activeLed = $derived(
        expandedIndex !== null
            ? (localLeds.find((x) => x.index === expandedIndex) ?? null)
            : null,
    );

    /* Sync H/S/L + hex display whenever the active LED's color changes from
       elsewhere (refresh, daemon snap, switching expanded LED, etc.). */
    $effect(() => {
        if (!activeLed) return;
        const hex = rgbToHex(activeLed.color);
        if (hex === lastAppliedHex) return;
        lastAppliedHex = hex;
        const [nh, ns, nl] = rgbToHsl(
            activeLed.color.r, activeLed.color.g, activeLed.color.b,
        );
        h = nh; s = ns; l = nl;
        hexInput = hex.toUpperCase();
    });

    /* -------- debounced writes ------------------------------------------ */
    function makeDebounce<T extends unknown[]>(
        fn: (...a: T) => Promise<void>,
        ms: number,
    ) {
        let t: ReturnType<typeof setTimeout> | null = null;
        return (...a: T) => {
            if (t) clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
        };
    }
    const colorWrite = makeDebounce(async (led: LedDto, rgb: RgbDto) => {
        try {
            await setLedColor(led.path, rgb.r, rgb.g, rgb.b);
            await onUpdated();
        } catch (e) {
            console.error("LED color write failed:", e);
            addToast(`LED color failed: ${e}`);
        } finally {
            pending = false;
        }
    }, 150);
    const brightnessWrite = makeDebounce(async (led: LedDto, value: number) => {
        try {
            await setLedBrightness(led.path, value);
            await onUpdated();
        } catch (e) {
            console.error("LED brightness write failed:", e);
            addToast(`Brightness failed: ${e}`);
        } finally {
            pending = false;
        }
    }, 150);
    const durationWrite = makeDebounce(async (led: LedDto, ms: number) => {
        try {
            await setLedEffectDuration(led.path, ms);
            await onUpdated();
        } catch (e) {
            console.error("LED duration write failed:", e);
            addToast(`Duration failed: ${e}`);
        } finally {
            pending = false;
        }
    }, 150);

    /* -------- apply helpers --------------------------------------------- */
    function applyHsl(nh: number, ns: number, nl: number) {
        h = nh; s = ns; l = nl;
        const rgb = hslToRgb(h, s, l);
        const hex = rgbToHex(rgb);
        lastAppliedHex = hex;
        hexInput = hex.toUpperCase();
        if (!activeLed) return;
        const idx = localLeds.findIndex((x) => x.index === activeLed.index);
        if (idx >= 0) localLeds[idx].color = rgb;
        pending = true;
        colorWrite(activeLed, rgb);
    }
    function applyHex(raw: string) {
        hexInput = raw.toUpperCase();
        const norm = raw.startsWith("#") ? raw : "#" + raw;
        if (!HEX_RE.test(norm)) return;
        const rgb = hexToRgb(norm);
        const canonical = rgbToHex(rgb);
        const [nh, ns, nl] = rgbToHsl(rgb.r, rgb.g, rgb.b);
        h = nh; s = ns; l = nl;
        lastAppliedHex = canonical;
        if (!activeLed) return;
        const idx = localLeds.findIndex((x) => x.index === activeLed.index);
        if (idx >= 0) localLeds[idx].color = rgb;
        pending = true;
        colorWrite(activeLed, rgb);
    }
    function applyBrightness(led: LedDto, value: number) {
        const idx = localLeds.findIndex((x) => x.index === led.index);
        if (idx >= 0) localLeds[idx].brightness = value;
        pending = true;
        brightnessWrite(led, value);
    }
    function applyDuration(led: LedDto, ms: number) {
        const idx = localLeds.findIndex((x) => x.index === led.index);
        if (idx >= 0) localLeds[idx].effect_duration = ms;
        pending = true;
        durationWrite(led, ms);
    }
    async function applyMode(led: LedDto, mode: number) {
        const idx = localLeds.findIndex((x) => x.index === led.index);
        const prev = idx >= 0 ? localLeds[idx].mode : mode;
        if (idx >= 0) localLeds[idx].mode = mode;
        pending = true;
        try {
            await setLedMode(led.path, mode);
            await onUpdated();
        } catch (e) {
            console.error("LED mode write failed:", e);
            addToast(`Mode failed: ${e}`);
            if (idx >= 0) localLeds[idx].mode = prev;
        } finally {
            pending = false;
        }
    }

    function toggleZone(index: number) {
        expandedIndex = expandedIndex === index ? null : index;
    }

    const PRESETS: { name: string; hex: string }[] = [
        { name: "Red", hex: "#FF0000" },
        { name: "Orange", hex: "#FF7F00" },
        { name: "Yellow", hex: "#FFFF00" },
        { name: "Green", hex: "#00C800" },
        { name: "Cyan", hex: "#00FFFF" },
        { name: "Blue", hex: "#0000FF" },
        { name: "Purple", hex: "#8000FF" },
        { name: "Pink", hex: "#FF1493" },
        { name: "White", hex: "#FFFFFF" },
        { name: "Off", hex: "#000000" },
    ];
</script>

<div class="flex flex-col gap-2">
    {#if profile.leds.length === 0}
        <div class="alert text-xs bg-base-200/40 border border-base-content/5">
            <span>No LEDs reported for this device.</span>
        </div>
    {/if}

    {#each localLeds as led (led.index)}
        {@const isOpen = expandedIndex === led.index}
        {@const hex = rgbToHex(led.color)}

        <div class="led-zone {isOpen ? 'led-zone-open' : ''}">
            <button onclick={() => toggleZone(led.index)} class="led-zone-header">
                <div class="flex items-center gap-2.5">
                    <div
                        class="w-3.5 h-3.5 rounded-full shrink-0"
                        style="background: {hex}; box-shadow: 0 0 8px {hex}55, inset 0 1px 0 rgba(255,255,255,.15);"
                    ></div>
                    <span class="text-sm font-medium">LED {led.index}</span>
                    <span class="badge badge-ghost badge-xs">
                        {LED_MODES[led.mode] ?? `Mode ${led.mode}`}
                    </span>
                </div>
                <svg
                    class="w-3.5 h-3.5 opacity-40 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                ><polyline points="6 9 12 15 18 9" /></svg>
            </button>

            {#if isOpen}
                <div class="led-zone-body">
                    <!-- Mode selector (always renders; falls back to defaults) -->
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] uppercase tracking-widest text-base-content/40 font-semibold">
                            Mode
                        </span>
                        <div class="pill-group flex-wrap">
                            {#each modesFor(led) as modeId (modeId)}
                                <button
                                    class="pill-btn {led.mode === modeId ? 'pill-btn-active' : ''}"
                                    onclick={() => applyMode(led, modeId)}
                                >
                                    {LED_MODES[modeId] ?? `Mode ${modeId}`}
                                </button>
                            {/each}
                        </div>
                        {#if led.modes.length === 0}
                            <span class="text-[10px] text-base-content/30 italic">
                                Driver didn't report supported modes — using the
                                standard set; unsupported modes may be rejected.
                            </span>
                        {/if}
                    </div>

                    <!-- Color picker (only when the mode uses color) -->
                    {#if needsColor(led.mode)}
                        <div class="card bg-base-200/40 border border-base-content/5 shadow-sm">
                            <div class="card-body p-3 gap-3">
                                <!-- Preview + hex -->
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-14 h-14 rounded-lg shrink-0 ring-1 ring-white/10 transition-[background] duration-150"
                                        style="background: {hex}; box-shadow: 0 0 18px {hex}40, inset 0 1px 0 rgba(255,255,255,.12);"
                                    ></div>
                                    <div class="flex-1 flex flex-col gap-1 min-w-0">
                                        <span class="text-[10px] uppercase tracking-widest text-base-content/40 font-semibold">
                                            Color
                                        </span>
                                        <div class="join w-full">
                                            <span class="join-item bg-base-300/60 text-base-content/40 px-2 flex items-center text-xs font-mono select-none">
                                                #
                                            </span>
                                            <input
                                                type="text"
                                                maxlength="6"
                                                spellcheck="false"
                                                value={hexInput.replace("#", "")}
                                                oninput={(e) => applyHex(e.currentTarget.value)}
                                                class="join-item input input-sm font-mono uppercase text-xs flex-1 tracking-widest"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <!-- HSL gradient sliders -->
                                <div
                                    class="flex flex-col gap-2"
                                    style="--h: {h}; --s: {s}; --l: {l};"
                                >
                                    <div class="hsl-row">
                                        <span class="badge badge-outline badge-xs w-7 justify-center font-mono">H</span>
                                        <input
                                            type="range" min="0" max="360" step="1"
                                            value={h}
                                            oninput={(e) => applyHsl(Number(e.currentTarget.value), s, l)}
                                            class="slider slider-swatch hsl-h"
                                        />
                                        <span class="hsl-value">{h}°</span>
                                    </div>
                                    <div class="hsl-row">
                                        <span class="badge badge-outline badge-xs w-7 justify-center font-mono">S</span>
                                        <input
                                            type="range" min="0" max="100" step="1"
                                            value={s}
                                            oninput={(e) => applyHsl(h, Number(e.currentTarget.value), l)}
                                            class="slider slider-swatch hsl-s"
                                        />
                                        <span class="hsl-value">{s}%</span>
                                    </div>
                                    <div class="hsl-row">
                                        <span class="badge badge-outline badge-xs w-7 justify-center font-mono">L</span>
                                        <input
                                            type="range" min="0" max="100" step="1"
                                            value={l}
                                            oninput={(e) => applyHsl(h, s, Number(e.currentTarget.value))}
                                            class="slider slider-swatch hsl-l"
                                        />
                                        <span class="hsl-value">{l}%</span>
                                    </div>
                                </div>

                                <!-- Presets -->
                                <div class="flex flex-col gap-1.5">
                                    <span class="text-[10px] uppercase tracking-widest text-base-content/40 font-semibold">
                                        Presets
                                    </span>
                                    <div class="flex flex-wrap gap-1.5">
                                        {#each PRESETS as p (p.hex)}
                                            <button
                                                onclick={() => applyHex(p.hex)}
                                                title={p.name}
                                                class="preset-swatch"
                                                style="background: {p.hex};"
                                            >
                                                <span class="sr-only">{p.name}</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <!-- Secondary/Tertiary indicators (read-only for now) -->
                                {#if needsSecondary(led.mode) || needsTertiary(led.mode)}
                                    <div class="divider my-0"></div>
                                    <div class="flex flex-col gap-1.5">
                                        {#if needsSecondary(led.mode)}
                                            <div class="flex items-center gap-2">
                                                <span class="badge badge-ghost badge-xs">2nd</span>
                                                <div
                                                    class="w-4 h-4 rounded-sm border border-white/10"
                                                    style="background: {rgbToHex(led.secondary_color)};"
                                                ></div>
                                                <span class="text-[10px] font-mono text-base-content/40">
                                                    {rgbToHex(led.secondary_color).toUpperCase()}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if needsTertiary(led.mode)}
                                            <div class="flex items-center gap-2">
                                                <span class="badge badge-ghost badge-xs">3rd</span>
                                                <div
                                                    class="w-4 h-4 rounded-sm border border-white/10"
                                                    style="background: {rgbToHex(led.tertiary_color)};"
                                                ></div>
                                                <span class="text-[10px] font-mono text-base-content/40">
                                                    {rgbToHex(led.tertiary_color).toUpperCase()}
                                                </span>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Brightness + Effect speed -->
                    <div class="grid grid-cols-1 {needsDuration(led.mode) ? 'md:grid-cols-2' : ''} gap-4">
                        <div class="flex flex-col gap-1.5">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] uppercase tracking-widest text-base-content/40 font-semibold">
                                    Brightness
                                </span>
                                <span class="text-xs font-mono text-base-content/50 tabular-nums">
                                    {Math.round((led.brightness / 255) * 100)}%
                                </span>
                            </div>
                            <input
                                type="range" min="0" max="255" step="1"
                                value={led.brightness}
                                oninput={(e) => applyBrightness(led, Number(e.currentTarget.value))}
                                class="slider"
                            />
                        </div>
                        {#if needsDuration(led.mode)}
                            <div class="flex flex-col gap-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] uppercase tracking-widest text-base-content/40 font-semibold">
                                        Effect Speed
                                    </span>
                                    <span class="text-xs font-mono text-base-content/50 tabular-nums">
                                        {led.effect_duration}ms
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="10000" step="100"
                                    value={led.effect_duration}
                                    oninput={(e) => applyDuration(led, Number(e.currentTarget.value))}
                                    class="slider"
                                />
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .hsl-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .hsl-value {
        font-family: ui-monospace, monospace;
        font-size: 10px;
        color: oklch(0.92 0 0 / 0.55);
        width: 2.75rem;
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .hsl-row .slider {
        flex: 1;
    }
    /* Channel-specific gradient tracks on top of the shared .slider */
    .hsl-h {
        --slider-track: linear-gradient(
            to right,
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
        );
    }
    .hsl-s {
        --slider-track: linear-gradient(
            to right,
            hsl(calc(var(--h) * 1deg), 0%, calc(var(--l) * 1%)),
            hsl(calc(var(--h) * 1deg), 100%, calc(var(--l) * 1%))
        );
    }
    .hsl-l {
        --slider-track: linear-gradient(
            to right,
            hsl(calc(var(--h) * 1deg), calc(var(--s) * 1%), 0%),
            hsl(calc(var(--h) * 1deg), calc(var(--s) * 1%), 50%),
            hsl(calc(var(--h) * 1deg), calc(var(--s) * 1%), 100%)
        );
    }
    .preset-swatch {
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        transition: transform 100ms ease, box-shadow 100ms ease;
        cursor: pointer;
    }
    .preset-swatch:hover {
        transform: scale(1.12);
        box-shadow:
            0 2px 6px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            0 0 0 2px rgba(255, 255, 255, 0.1);
    }
</style>
