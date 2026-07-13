<!-- KeyboardLayout — DOM renderer for a KeyboardRenderModel (no three.js).
     Each cap is an absolutely-positioned button in key-unit space scaled to
     pixels. The (row,col) on every key ties a click back to a clackd matrix
     slot. Source-agnostic: works for both the matrix-grid fallback and the
     VIA-definition layout. -->
<script lang="ts">
    import type { KeyboardRenderModel } from "$lib/keyboard/model";

    interface Props {
        model: KeyboardRenderModel;
        selected: { row: number; col: number } | null;
        onSelect: (row: number, col: number) => void;
        onContextMenu?: (row: number, col: number, event: MouseEvent) => void;
        lighting?: number[] | null;
    }

    let { model, selected, onSelect, onContextMenu, lighting }: Props = $props();

    /* Pixels per key unit. */
    const UNIT = 46;
    const GAP = 3;

    // Track recently clicked keys for interactive keystroke lighting effects
    let litKeys = $state<Record<string, boolean>>({});

    function handleKeyClick(key: any) {
        onSelect(key.row, key.col);
        const keyId = `${key.row},${key.col}`;
        litKeys[keyId] = true;
        setTimeout(() => {
            litKeys[keyId] = false;
        }, 800);
    }

    // Determine the CSS effect class from the current lighting mode
    // Device lighting mode numbers:
    // 1: Static, 2: Keystroke light-up, 3: Keystroke dim, 5: Rain, 6: Random colors, 7: Breathing, 8: Spectrum cycle, 11: Rainbow wave, 128: Off
    let effectClass = $derived(
        lighting ? `effect-${lighting[0]}` : 'effect-none'
    );

    // Compute speed and brightness vars
    let styleVars = $derived(() => {
        if (!lighting) return '';
        const [mode, r, g, b, brightness, _, speed, __] = lighting;
        const brightnessPct = brightness / 15;
        const speedVal = speed ?? 8;
        // Translate speed 0-15 to an animation duration (15 -> 0.4s, 0 -> 6s)
        const speedSec = 0.4 + (15 - speedVal) * 0.4;
        return `
            --led-r: ${r};
            --led-g: ${g};
            --led-b: ${b};
            --led-color: rgb(${r}, ${g}, ${b});
            --led-brightness: ${brightnessPct};
            --led-speed: ${speedSec}s;
        `;
    });
</script>

<div
    class="keyboard-case {effectClass}"
    style="{styleVars()}"
>
    <!-- Ambient under-glow: a soft pool of light that bleeds out from under
         the case, sold as the keyboard's RGB spilling onto the surface. -->
    <div class="keyboard-underglow" aria-hidden="true"></div>

    <div
        class="relative keyboard-layout-container"
        style="width: {model.width * UNIT}px; height: {model.height * UNIT}px;"
    >
    {#each model.keys as key (key.row + "," + key.col)}
        {@const isSelected = selected?.row === key.row && selected?.col === key.col}
        {@const isLit = litKeys[key.row + "," + key.col]}
        <button
            type="button"
            onclick={() => handleKeyClick(key)}
            oncontextmenu={(e) => onContextMenu?.(key.row, key.col, e)}
            class="kbd-cap {isSelected ? 'kbd-cap-selected' : ''} {isLit ? 'kbd-cap-lit' : ''}"
            title={`r${key.row} c${key.col} · 0x${key.keycode.toString(16).padStart(4, "0")} · Right-click to restore default`}
            style="
                left: {key.x * UNIT}px;
                top: {key.y * UNIT}px;
                width: {key.w * UNIT - GAP}px;
                height: {key.h * UNIT - GAP}px;
                transform: rotate({key.r}deg);
                transform-origin: {(key.rx - key.x) * UNIT}px {(key.ry - key.y) * UNIT}px;
                --key-x: ${key.x};
                --key-y: ${key.y};
            "
        >
            <span class="kbd-cap-label">{key.label}</span>
        </button>
    {/each}
    </div>
</div>

<style>
    /* ==========================================
       GLASSMORPHIC KEYBOARD CASE
       The keys sit on a frosted, rounded "tray" so they read as a
       physical board rather than floating in space.
       ========================================== */
    .keyboard-case {
        position: relative;
        display: inline-flex;
        margin: 0 auto;
        padding: 26px;
        border-radius: 22px;
        /* Frosted glass surface */
        background:
            linear-gradient(
                145deg,
                oklch(1 0 0 / 0.07),
                oklch(1 0 0 / 0.015) 40%,
                oklch(0 0 0 / 0.12)
            );
        border: 1px solid oklch(1 0 0 / 0.12);
        box-shadow:
            inset 0 1px 0 0 oklch(1 0 0 / 0.18),
            inset 0 -1px 1px 0 oklch(0 0 0 / 0.4),
            0 12px 40px -8px oklch(0 0 0 / 0.55);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        isolation: isolate;
    }

    /* Ambient light pool spilling out from beneath the case. Tinted by the
       current LED color so the whole board feels lit from within. */
    .keyboard-underglow {
        position: absolute;
        inset: 6px;
        border-radius: 28px;
        z-index: -1;
        pointer-events: none;
        opacity: calc(0.25 + 0.5 * var(--led-brightness, 0.6));
        background:
            radial-gradient(
                120% 90% at 50% 65%,
                rgba(var(--led-r, 120), var(--led-g, 130), var(--led-b, 255), 0.4),
                transparent 70%
            );
        filter: blur(36px);
        transition: opacity 240ms ease;
    }
    /* When lighting is off, kill the ambient glow entirely. */
    .effect-128 .keyboard-underglow,
    .effect-none .keyboard-underglow {
        opacity: 0;
    }

    .kbd-cap {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm, 6px);
        /* Frosted glass keycap: translucent so the board shows through, with a
           soft top-down gradient and a glassy top highlight. */
        background:
            linear-gradient(
                160deg,
                oklch(1 0 0 / 0.1),
                oklch(1 0 0 / 0.03) 45%,
                oklch(0 0 0 / 0.18)
            );
        border: 1px solid oklch(1 0 0 / 0.1);
        box-shadow:
            inset 0 1px 0 0 oklch(1 0 0 / 0.14),
            inset 0 -2px 3px 0 oklch(0 0 0 / 0.3),
            0 1px 2px 0 oklch(0 0 0 / 0.35);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        color: oklch(0.95 0 0);
        font-size: 10px;
        line-height: 1;
        padding: 2px;
        overflow: hidden;
        cursor: pointer;
        transition:
            background 120ms ease,
            box-shadow 120ms ease,
            transform 120ms ease,
            color 120ms ease,
            border-color 120ms ease;
    }
    .kbd-cap:hover {
        background:
            linear-gradient(
                160deg,
                oklch(1 0 0 / 0.16),
                oklch(1 0 0 / 0.06) 45%,
                oklch(0 0 0 / 0.14)
            );
        border-color: oklch(1 0 0 / 0.18);
    }
    .kbd-cap-selected {
        background: color-mix(in oklab, var(--color-primary) 40%, var(--color-base-300)) !important;
        color: color-mix(in oklab, var(--color-primary) 10%, white) !important;
        border-color: var(--color-primary) !important;
        box-shadow:
            0 0 0 2px color-mix(in oklab, var(--color-primary) 70%, transparent),
            0 0 12px 0 color-mix(in oklab, var(--color-primary) 50%, transparent) !important;
        text-shadow: none !important;
        animation: none !important;
    }
    .kbd-cap-label {
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        z-index: 2;
    }

    /* ==========================================
       DYNAMIC LIGHTING KEYFRAME ANIMATIONS
       ========================================== */

    /* Generic Spectrum Cycle (shared by spectrum & rainbow) — label stays
       white; the hue only tints the rim, the under-bleed and the halo. */
    @keyframes spectrum-led {
        0%   { border-color: hsla(0, 95%, 65%, 0.4);   box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(0, 95%, 65%, 0.22),   0 0 9px hsla(0, 95%, 65%, 0.28); }
        17%  { border-color: hsla(60, 95%, 65%, 0.4);  box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(60, 95%, 65%, 0.22),  0 0 9px hsla(60, 95%, 65%, 0.28); }
        33%  { border-color: hsla(120, 95%, 65%, 0.4); box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(120, 95%, 65%, 0.22), 0 0 9px hsla(120, 95%, 65%, 0.28); }
        50%  { border-color: hsla(180, 95%, 65%, 0.4); box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(180, 95%, 65%, 0.22), 0 0 9px hsla(180, 95%, 65%, 0.28); }
        67%  { border-color: hsla(240, 95%, 65%, 0.4); box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(240, 95%, 65%, 0.22), 0 0 9px hsla(240, 95%, 65%, 0.28); }
        83%  { border-color: hsla(300, 95%, 65%, 0.4); box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(300, 95%, 65%, 0.22), 0 0 9px hsla(300, 95%, 65%, 0.28); }
        100% { border-color: hsla(360, 95%, 65%, 0.4); box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.14), inset 0 -5px 7px hsla(360, 95%, 65%, 0.22), 0 0 9px hsla(360, 95%, 65%, 0.28); }
    }

    /* 1. Static Mode — subtle backlight: glass tints toward the LED color and
       a soft halo radiates out, but the label stays bright and legible. */
    .effect-1 .kbd-cap:not(.kbd-cap-selected) {
        color: oklch(0.96 0 0);
        border-color: rgba(var(--led-r), var(--led-g), var(--led-b), calc(0.15 + 0.35 * var(--led-brightness)));
        text-shadow: 0 0 calc(var(--led-brightness) * 4px) rgba(var(--led-r), var(--led-g), var(--led-b), 0.55);
        box-shadow:
            inset 0 1px 0 0 oklch(1 0 0 / 0.14),
            inset 0 -2px 3px 0 oklch(0 0 0 / 0.3),
            /* gentle colored bleed rising from the base of the cap */
            inset 0 -5px 7px rgba(var(--led-r), var(--led-g), var(--led-b), calc(var(--led-brightness) * 0.22)),
            /* soft halo around the cap */
            0 0 calc(3px + var(--led-brightness) * 7px) rgba(var(--led-r), var(--led-g), var(--led-b), calc(var(--led-brightness) * 0.28));
    }

    /* 2. Keystroke Light-up */
    .effect-2 .kbd-cap-lit:not(.kbd-cap-selected) {
        color: oklch(0.97 0 0) !important;
        border-color: rgba(var(--led-r), var(--led-g), var(--led-b), 0.6) !important;
        text-shadow: 0 0 6px var(--led-color) !important;
        box-shadow:
            inset 0 1px 0 0 oklch(1 0 0 / 0.14),
            inset 0 -5px 7px rgba(var(--led-r), var(--led-g), var(--led-b), 0.4),
            0 0 calc(4px + var(--led-brightness) * 9px) rgba(var(--led-r), var(--led-g), var(--led-b), calc(0.3 + var(--led-brightness) * 0.3)) !important;
        transition: none !important; /* Instant light-up, smooth fade out */
    }

    /* 3. Keystroke Dim */
    .effect-3 .kbd-cap:not(.kbd-cap-selected) {
        color: oklch(0.96 0 0);
        border-color: rgba(var(--led-r), var(--led-g), var(--led-b), calc(0.15 + 0.35 * var(--led-brightness)));
        text-shadow: 0 0 calc(var(--led-brightness) * 4px) rgba(var(--led-r), var(--led-g), var(--led-b), 0.55);
        box-shadow:
            inset 0 1px 0 0 oklch(1 0 0 / 0.14),
            inset 0 -5px 7px rgba(var(--led-r), var(--led-g), var(--led-b), calc(var(--led-brightness) * 0.22));
    }
    .effect-3 .kbd-cap-lit:not(.kbd-cap-selected) {
        color: rgba(255, 255, 255, 0.15) !important;
        border-color: rgba(255, 255, 255, 0.02) !important;
        text-shadow: none !important;
        box-shadow: none !important;
        transition: none !important;
    }

    /* 5. Rain (Vertical Cascades) */
    @keyframes rain-led {
        0%, 90%, 100% {
            color: oklch(0.7 0 0);
            border-color: oklch(1 0 0 / 0.08);
            text-shadow: none;
            box-shadow:
                inset 0 1px 0 0 oklch(1 0 0 / 0.14),
                inset 0 -2px 3px 0 oklch(0 0 0 / 0.3);
        }
        10% {
            color: oklch(0.97 0 0);
            border-color: hsla(135, 95%, 60%, 0.5);
            text-shadow: 0 0 6px hsl(135, 95%, 60%);
            box-shadow:
                inset 0 1px 0 0 oklch(1 0 0 / 0.14),
                inset 0 -5px 7px rgba(0, 255, 100, 0.28),
                0 0 calc(4px + var(--led-brightness) * 9px) rgba(0, 255, 100, calc(0.3 + var(--led-brightness) * 0.3));
        }
    }
    .effect-5 .kbd-cap:not(.kbd-cap-selected) {
        animation: rain-led var(--led-speed) ease-in-out infinite;
        animation-delay: calc(var(--key-y) * -0.3s);
    }

    /* 6. Random Colors */
    @keyframes random-color-led-1 {
        0%, 100% { color: hsl(10, 90%, 65%); text-shadow: 0 0 6px hsl(10, 90%, 65%); border-color: hsla(10, 90%, 65%, 0.3); }
        33% { color: hsl(140, 90%, 65%); text-shadow: 0 0 6px hsl(140, 90%, 65%); border-color: hsla(140, 90%, 65%, 0.3); }
        66% { color: hsl(260, 90%, 65%); text-shadow: 0 0 6px hsl(260, 90%, 65%); border-color: hsla(260, 90%, 65%, 0.3); }
    }
    @keyframes random-color-led-2 {
        0%, 100% { color: hsl(180, 90%, 65%); text-shadow: 0 0 6px hsl(180, 90%, 65%); border-color: hsla(180, 90%, 65%, 0.3); }
        33% { color: hsl(300, 90%, 65%); text-shadow: 0 0 6px hsl(300, 90%, 65%); border-color: hsla(300, 90%, 65%, 0.3); }
        66% { color: hsl(50, 90%, 65%); text-shadow: 0 0 6px hsl(50, 90%, 65%); border-color: hsla(50, 90%, 65%, 0.3); }
    }
    .effect-6 .kbd-cap:not(.kbd-cap-selected) {
        animation-duration: var(--led-speed);
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
    }
    .effect-6 .kbd-cap:not(.kbd-cap-selected):nth-child(2n) {
        animation-name: random-color-led-1;
        animation-delay: calc(var(--key-x) * -0.12s);
    }
    .effect-6 .kbd-cap:not(.kbd-cap-selected):nth-child(2n+1) {
        animation-name: random-color-led-2;
        animation-delay: calc(var(--key-y) * -0.18s);
    }

    /* 7. Breathing */
    @keyframes breathe-led {
        0%, 100% {
            color: oklch(0.7 0 0);
            border-color: rgba(var(--led-r), var(--led-g), var(--led-b), 0.08);
            text-shadow: none;
            box-shadow:
                inset 0 1px 0 0 oklch(1 0 0 / 0.14),
                inset 0 -2px 3px 0 oklch(0 0 0 / 0.3);
        }
        50% {
            color: oklch(0.96 0 0);
            border-color: rgba(var(--led-r), var(--led-g), var(--led-b), calc(0.2 + 0.3 * var(--led-brightness)));
            text-shadow: 0 0 calc(var(--led-brightness) * 5px) var(--led-color);
            box-shadow:
                inset 0 1px 0 0 oklch(1 0 0 / 0.14),
                inset 0 -5px 7px rgba(var(--led-r), var(--led-g), var(--led-b), calc(var(--led-brightness) * 0.25)),
                0 0 calc(3px + var(--led-brightness) * 8px) rgba(var(--led-r), var(--led-g), var(--led-b), calc(var(--led-brightness) * 0.3));
        }
    }
    .effect-7 .kbd-cap:not(.kbd-cap-selected) {
        animation: breathe-led var(--led-speed) ease-in-out infinite;
    }

    /* 8. Spectrum Cycle */
    .effect-8 .kbd-cap:not(.kbd-cap-selected) {
        animation: spectrum-led var(--led-speed) linear infinite;
    }

    /* 11. Rainbow Wave (Horizontal Wave) */
    .effect-11 .kbd-cap:not(.kbd-cap-selected) {
        animation: spectrum-led var(--led-speed) linear infinite;
        animation-delay: calc(var(--key-x) * -0.15s);
    }
</style>
