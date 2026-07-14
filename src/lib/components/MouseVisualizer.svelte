<!-- MouseVisualizer — parametric glassmorphic mouse built from the live
     ProfileDto, replacing the per-model Piper SVG assets. Zones follow the
     libratbag button convention (0 left, 1 right, 2 wheel, 3 back, 4 forward,
     5 spine/DPI, 6+ extras) and keep the same "buttonN"/"ledN" id contract as
     the rest of the app. Annotated callouts show each zone's current mapping;
     LED zones light up with the device's real color and mode. -->
<script lang="ts">
    import type { ProfileDto, ButtonDto, LedDto } from "$lib/types";
    import { LED_MODES } from "$lib/types";
    import { formatButtonAction } from "$lib/mouse/actions";

    interface Props {
        profile: ProfileDto;
        /** Currently selected zone id, e.g. "button2" or "led0" */
        selectedId?: string | null;
        onSelect?: (id: string) => void;
        /** CSS color for the ambient pool of light under the mouse */
        ambientColor?: string | null;
        class?: string;
    }

    let {
        profile,
        selectedId = null,
        onSelect,
        ambientColor = null,
        class: className = "",
    }: Props = $props();

    let hoveredId: string | null = $state(null);

    /* ── Zone lookup helpers ─────────────────────────────────── */

    const button = (i: number): ButtonDto | undefined =>
        profile.buttons.find((b) => b.index === i);
    const led = (i: number): LedDto | undefined =>
        profile.leds.find((l) => l.index === i);

    function mappingFor(id: string): string {
        if (id.startsWith("button")) {
            const b = button(parseInt(id.slice(6), 10));
            return b ? truncate(formatButtonAction(b), 20) : "—";
        }
        const l = led(parseInt(id.slice(3), 10));
        return l ? (LED_MODES[l.mode] ?? `Mode ${l.mode}`) : "—";
    }

    function truncate(s: string, n: number): string {
        return s.length > n ? s.slice(0, n - 1) + "…" : s;
    }

    /* ── Callout annotations ─────────────────────────────────── */

    interface Callout {
        id: string;
        role: string;
        /* Leader-line start point, on the zone */
        ax: number;
        ay: number;
        side: "left" | "right";
        /* Label baseline y */
        ly: number;
    }

    let callouts: Callout[] = $derived.by(() => {
        const list: Callout[] = [];
        if (button(0)) list.push({ id: "button0", role: "Left", ax: 226, ay: 80, side: "left", ly: 64 });
        if (led(1)) list.push({ id: "led1", role: "Wheel light", ax: 266, ay: 96, side: "left", ly: 148 });
        if (button(4)) list.push({ id: "button4", role: "Forward", ax: 179, ay: 210, side: "left", ly: 226 });
        if (button(3)) list.push({ id: "button3", role: "Back", ax: 177, ay: 255, side: "left", ly: 300 });
        if (button(1)) list.push({ id: "button1", role: "Right", ax: 334, ay: 80, side: "right", ly: 64 });
        if (button(2)) list.push({ id: "button2", role: "Wheel", ax: 293, ay: 88, side: "right", ly: 148 });
        if (button(5)) list.push({ id: "button5", role: "DPI / Mode", ax: 291, ay: 150, side: "right", ly: 226 });
        if (led(0)) list.push({ id: "led0", role: "Logo light", ax: 300, ay: 304, side: "right", ly: 312 });
        return list;
    });

    function leaderPath(c: Callout): string {
        return c.side === "left"
            ? `M ${c.ax} ${c.ay} L 162 ${c.ly} L 152 ${c.ly}`
            : `M ${c.ax} ${c.ay} L 398 ${c.ly} L 408 ${c.ly}`;
    }

    /* Buttons/LEDs with no home on the generic silhouette get a chip row. */
    let extraButtons = $derived(profile.buttons.filter((b) => b.index > 5));
    let extraLeds = $derived(profile.leds.filter((l) => l.index > 1));

    /* ── LED presentation ────────────────────────────────────── */

    function ledColor(l: LedDto | undefined): string {
        if (!l || l.mode === 0) return "oklch(0.55 0 0 / 0.35)";
        return `rgb(${l.color.r}, ${l.color.g}, ${l.color.b})`;
    }

    /* Mode → CSS animation class: 3 Breathing / 5 Starlight pulse,
       2 Cycle / 4 ColorWave / 6 TriColor hue-rotate. */
    function ledClass(l: LedDto | undefined): string {
        if (!l || l.mode === 0) return "led-off";
        if (l.mode === 3 || l.mode === 5) return "led-breathing";
        if (l.mode === 2 || l.mode === 4 || l.mode === 6) return "led-cycle";
        return "led-solid";
    }

    /* ── Interaction ─────────────────────────────────────────── */

    const sel = (id: string) => selectedId === id;
    const hot = (id: string) => hoveredId === id && selectedId !== id;

    function pick(id: string) {
        onSelect?.(id);
    }

    function onKey(e: KeyboardEvent, id: string) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick(id);
        }
    }

    /* ── Stats footer ────────────────────────────────────────── */

    let activeDpi = $derived(
        (profile.resolutions.find((r) => r.is_active) ?? profile.resolutions[0])
            ?.dpi_x,
    );
</script>

<div class="mouse-viz {className}">
    <div class="mouse-stage">
        <!-- Ambient pool of light spilling out from under the mouse,
             tinted by the device's LEDs (mirrors the keyboard underglow) -->
        <div
            class="mouse-underglow"
            style="--glow: {ambientColor ?? 'rgb(120,160,255)'}"
            aria-hidden="true"
        ></div>

        <svg viewBox="0 0 560 440" role="group" aria-label="Mouse zones">
            <defs>
                <linearGradient id="mv-body" x1="0" y1="0" x2="0.65" y2="1">
                    <stop offset="0" stop-color="oklch(1 0 0 / 0.10)" />
                    <stop offset="0.45" stop-color="oklch(1 0 0 / 0.03)" />
                    <stop offset="1" stop-color="oklch(0 0 0 / 0.18)" />
                </linearGradient>
                <linearGradient id="mv-knob" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="oklch(1 0 0 / 0.20)" />
                    <stop offset="0.5" stop-color="oklch(1 0 0 / 0.05)" />
                    <stop offset="1" stop-color="oklch(0 0 0 / 0.28)" />
                </linearGradient>
                <radialGradient id="mv-sheen" cx="0.5" cy="0" r="1">
                    <stop offset="0" stop-color="oklch(1 0 0 / 0.10)" />
                    <stop offset="0.6" stop-color="oklch(1 0 0 / 0)" />
                </radialGradient>
                <clipPath id="mv-clip">
                    <path
                        d="M 280 30 C 230 30, 196 52, 188 96 C 181 128, 181 162, 185 198 C 188 234, 180 260, 178 294 C 177 338, 194 378, 220 398 C 242 413, 260 415, 280 415 C 300 415, 318 413, 340 398 C 366 378, 383 338, 382 294 C 380 260, 372 234, 375 198 C 379 162, 379 128, 372 96 C 364 52, 330 30, 280 30 Z"
                    />
                </clipPath>
            </defs>

            <!-- Chassis -->
            <path
                class="mouse-body"
                d="M 280 30 C 230 30, 196 52, 188 96 C 181 128, 181 162, 185 198 C 188 234, 180 260, 178 294 C 177 338, 194 378, 220 398 C 242 413, 260 415, 280 415 C 300 415, 318 413, 340 398 C 366 378, 383 338, 382 294 C 380 260, 372 234, 375 198 C 379 162, 379 128, 372 96 C 364 52, 330 30, 280 30 Z"
            />

            <!-- Side buttons: a curved two-button pod following the left
                 contour, split by a seam — outside the body clip so its lip
                 sits slightly proud of the shell -->
            {#if button(4)}
                <path
                    class="knob side zone"
                    class:hot={hot("button4")}
                    class:sel={sel("button4")}
                    d="M 196.4 199 C 196.2 190, 191.5 185.6, 185 187.3 C 180.6 188.6, 179 194, 178.9 201 C 178.8 211, 179.1 221, 178.8 231 L 196.8 232.5 C 197.2 221, 197 210, 196.4 199 Z"
                    role="button" tabindex="0"
                    aria-label="Forward button"
                    onclick={() => pick("button4")}
                    onkeydown={(e) => onKey(e, "button4")}
                    onmouseenter={() => (hoveredId = "button4")}
                    onmouseleave={() => (hoveredId = null)}
                />
            {/if}
            {#if button(3)}
                <path
                    class="knob side zone"
                    class:hot={hot("button3")}
                    class:sel={sel("button3")}
                    d="M 178.6 237 L 196.4 237.5 C 196 250, 195.3 263, 194.2 274 C 190 281.5, 180 280, 176.4 273 C 175.9 261, 177.5 248, 178.6 237 Z"
                    role="button" tabindex="0"
                    aria-label="Back button"
                    onclick={() => pick("button3")}
                    onkeydown={(e) => onKey(e, "button3")}
                    onmouseenter={() => (hoveredId = "button3")}
                    onmouseleave={() => (hoveredId = null)}
                />
            {/if}

            <g clip-path="url(#mv-clip)">
                <!-- Main click plates -->
                {#if button(0)}
                    <path
                        class="plate zone"
                        class:hot={hot("button0")}
                        class:sel={sel("button0")}
                        d="M 0 0 H 268 V 152 Q 268 176 244 181 C 210 188 170 195 120 199 L 0 204 Z"
                        role="button" tabindex="0"
                        aria-label="Left button"
                        onclick={() => pick("button0")}
                        onkeydown={(e) => onKey(e, "button0")}
                        onmouseenter={() => (hoveredId = "button0")}
                        onmouseleave={() => (hoveredId = null)}
                    />
                {/if}
                {#if button(1)}
                    <path
                        class="plate zone"
                        class:hot={hot("button1")}
                        class:sel={sel("button1")}
                        d="M 560 0 H 292 V 152 Q 292 176 316 181 C 350 188 390 195 440 199 L 560 204 Z"
                        role="button" tabindex="0"
                        aria-label="Right button"
                        onclick={() => pick("button1")}
                        onkeydown={(e) => onKey(e, "button1")}
                        onmouseenter={() => (hoveredId = "button1")}
                        onmouseleave={() => (hoveredId = null)}
                    />
                {/if}

                <!-- Recessed center channel -->
                <rect
                    class="mouse-channel"
                    x="266" y="34" width="28" height="166" rx="14"
                />

                <!-- Top sheen -->
                <ellipse
                    cx="280" cy="60" rx="150" ry="90"
                    fill="url(#mv-sheen)"
                    pointer-events="none"
                />
            </g>

            <!-- Wheel LED halo (led1) — drawn under the wheel -->
            {#if led(1)}
                <rect
                    class="led-ring zone {ledClass(led(1))}"
                    class:hot={hot("led1")}
                    class:sel={sel("led1")}
                    style="--led: {ledColor(led(1))}"
                    x="263" y="53" width="34" height="74" rx="17"
                    role="button" tabindex="0"
                    aria-label="Wheel light"
                    onclick={() => pick("led1")}
                    onkeydown={(e) => onKey(e, "led1")}
                    onmouseenter={() => (hoveredId = "led1")}
                    onmouseleave={() => (hoveredId = null)}
                />
            {/if}

            <!-- Scroll wheel (button2) -->
            {#if button(2)}
                <g
                    class="zone wheel-zone"
                    role="button" tabindex="0"
                    aria-label="Wheel click"
                    onclick={() => pick("button2")}
                    onkeydown={(e) => onKey(e, "button2")}
                    onmouseenter={() => (hoveredId = "button2")}
                    onmouseleave={() => (hoveredId = null)}
                >
                    <rect
                        class="knob"
                        class:hot={hot("button2")}
                        class:sel={sel("button2")}
                        x="268" y="58" width="24" height="64" rx="12"
                    />
                    {#each [72, 84, 96, 108] as y (y)}
                        <line
                            class="wheel-ridge"
                            x1="273" y1={y} x2="287" y2={y}
                        />
                    {/each}
                </g>
            {/if}

            <!-- Spine button below the wheel (button5, usually DPI) -->
            {#if button(5)}
                <rect
                    class="knob zone"
                    class:hot={hot("button5")}
                    class:sel={sel("button5")}
                    x="268" y="134" width="24" height="30" rx="8"
                    role="button" tabindex="0"
                    aria-label="DPI button"
                    onclick={() => pick("button5")}
                    onkeydown={(e) => onKey(e, "button5")}
                    onmouseenter={() => (hoveredId = "button5")}
                    onmouseleave={() => (hoveredId = null)}
                />
            {/if}

            <!-- Logo LED (led0) -->
            {#if led(0)}
                <g
                    class="zone led-logo {ledClass(led(0))}"
                    class:hot={hot("led0")}
                    class:sel={sel("led0")}
                    style="--led: {ledColor(led(0))}"
                    role="button" tabindex="0"
                    aria-label="Logo light"
                    onclick={() => pick("led0")}
                    onkeydown={(e) => onKey(e, "led0")}
                    onmouseenter={() => (hoveredId = "led0")}
                    onmouseleave={() => (hoveredId = null)}
                >
                    <circle class="led-logo-ring" cx="280" cy="302" r="19" />
                    <circle class="led-logo-core" cx="280" cy="302" r="8" />
                </g>
            {/if}

            <!-- Callout annotations -->
            {#each callouts as c (c.id)}
                <g
                    class="callout"
                    class:hot={hot(c.id)}
                    class:sel={sel(c.id)}
                    role="button" tabindex="0"
                    aria-label="{c.role}: {mappingFor(c.id)}"
                    onclick={() => pick(c.id)}
                    onkeydown={(e) => onKey(e, c.id)}
                    onmouseenter={() => (hoveredId = c.id)}
                    onmouseleave={() => (hoveredId = null)}
                >
                    <rect
                        x={c.side === "left" ? 0 : 410}
                        y={c.ly - 20}
                        width="150" height="40"
                        fill="transparent"
                    />
                    <path class="callout-line" d={leaderPath(c)} />
                    <circle class="callout-dot" cx={c.ax} cy={c.ay} r="3" />
                    <text
                        class="callout-role"
                        x={c.side === "left" ? 148 : 412}
                        y={c.ly - 6}
                        text-anchor={c.side === "left" ? "end" : "start"}
                    >
                        {c.role.toUpperCase()}
                    </text>
                    <text
                        class="callout-map"
                        x={c.side === "left" ? 148 : 412}
                        y={c.ly + 12}
                        text-anchor={c.side === "left" ? "end" : "start"}
                    >
                        {mappingFor(c.id)}
                    </text>
                </g>
            {/each}
        </svg>
    </div>

    <!-- Overflow zones with no seat on the generic silhouette -->
    {#if extraButtons.length > 0 || extraLeds.length > 0}
        <div class="mouse-extras">
            {#each extraButtons as b (b.index)}
                <button
                    class="pill-btn text-[11px] {sel(`button${b.index}`)
                        ? 'pill-btn-active'
                        : ''}"
                    onclick={() => pick(`button${b.index}`)}
                >
                    B{b.index} · {truncate(formatButtonAction(b), 14)}
                </button>
            {/each}
            {#each extraLeds as l (l.index)}
                <button
                    class="pill-btn text-[11px] {sel(`led${l.index}`)
                        ? 'pill-btn-active'
                        : ''}"
                    onclick={() => pick(`led${l.index}`)}
                >
                    <span
                        class="extra-led-dot"
                        style="background: {ledColor(l)}"
                    ></span>
                    LED {l.index} · {LED_MODES[l.mode] ?? l.mode}
                </button>
            {/each}
        </div>
    {/if}

    <!-- Live device stats -->
    <footer class="mouse-stats">
        {#if activeDpi}
            <div class="mouse-stat">
                <span class="mouse-stat-value">{activeDpi}</span>
                <span class="mouse-stat-label">DPI</span>
            </div>
        {/if}
        {#if profile.report_rate > 0}
            <div class="mouse-stat">
                <span class="mouse-stat-value">{profile.report_rate}</span>
                <span class="mouse-stat-label">Hz</span>
            </div>
        {/if}
        <div class="mouse-stat">
            <span class="mouse-stat-value">{profile.buttons.length}</span>
            <span class="mouse-stat-label">Buttons</span>
        </div>
    </footer>
</div>

<style>
    .mouse-viz {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .mouse-stage {
        position: relative;
        isolation: isolate;
    }

    .mouse-stage svg {
        width: 100%;
        height: auto;
        max-height: 460px;
        display: block;
        font-family: var(--font-sans);
        /* let the chassis drop-shadow and LED glows bleed past the viewBox */
        overflow: visible;
    }

    /* Ambient light pool under the chassis, tinted by the device LEDs */
    .mouse-underglow {
        position: absolute;
        left: 50%;
        bottom: 6%;
        width: 46%;
        height: 34%;
        transform: translateX(-50%);
        z-index: -1;
        pointer-events: none;
        background: radial-gradient(
            50% 50% at 50% 50%,
            var(--glow),
            transparent 72%
        );
        filter: blur(38px);
        opacity: 0.45;
        transition: opacity 240ms ease;
    }

    /* ── Chassis & surfaces ─────────────────────────────────── */

    .mouse-body {
        fill: url(#mv-body);
        stroke: oklch(1 0 0 / 0.14);
        stroke-width: 1.5;
        filter: drop-shadow(0 18px 26px oklch(0 0 0 / 0.45));
    }

    /* Flat HIG themes: functional preview keeps its colors, loses the
       ambient bloom and floating-chassis shadow */
    :global([data-style="flat"]) .mouse-underglow {
        display: none;
    }
    :global([data-style="flat"]) .mouse-body {
        filter: none;
    }
    :global([data-style="flat"]) .led-ring,
    :global([data-style="flat"]) .led-ring.hot,
    :global([data-style="flat"]) .led-ring.sel,
    :global([data-style="flat"]) .led-logo-core,
    :global([data-style="flat"]) .led-logo.sel {
        filter: none;
    }

    .mouse-channel {
        fill: oklch(0 0 0 / 0.28);
        stroke: oklch(0 0 0 / 0.35);
        stroke-width: 1;
        pointer-events: none;
    }

    /* ── Interactive zones ──────────────────────────────────── */

    .zone {
        cursor: pointer;
        outline: none;
        transition:
            fill 150ms ease,
            stroke 150ms ease,
            filter 200ms ease;
    }

    .plate {
        fill: oklch(1 0 0 / 0.04);
        stroke: oklch(0 0 0 / 0.32);
        stroke-width: 1.2;
    }
    .plate.hot {
        fill: color-mix(in oklab, var(--color-primary) 10%, transparent);
        stroke: color-mix(in oklab, var(--color-primary) 45%, transparent);
    }
    .plate.sel {
        fill: color-mix(in oklab, var(--color-primary) 16%, transparent);
        stroke: color-mix(in oklab, var(--color-primary) 85%, transparent);
        filter: drop-shadow(0 0 10px color-mix(in oklab, var(--color-primary) 50%, transparent));
    }

    .knob {
        fill: url(#mv-knob);
        stroke: oklch(1 0 0 / 0.16);
        stroke-width: 1.2;
        transition:
            fill 150ms ease,
            stroke 150ms ease,
            filter 200ms ease;
    }
    /* Side buttons read as part of the contour: quieter rim until engaged */
    .knob.side {
        stroke: oklch(1 0 0 / 0.09);
        fill-opacity: 0.75;
    }

    .knob.hot,
    .wheel-zone:hover .knob {
        stroke: color-mix(in oklab, var(--color-primary) 60%, transparent);
    }
    .knob.sel {
        stroke: var(--color-primary);
        filter: drop-shadow(0 0 8px color-mix(in oklab, var(--color-primary) 60%, transparent));
    }

    .wheel-ridge {
        stroke: oklch(0 0 0 / 0.35);
        stroke-width: 2;
        stroke-linecap: round;
        pointer-events: none;
    }

    /* ── LED zones ──────────────────────────────────────────── */

    .led-ring {
        fill: none;
        stroke: var(--led);
        stroke-width: 2.5;
        filter: drop-shadow(0 0 7px var(--led));
    }
    .led-ring.hot,
    .led-ring.sel {
        stroke-width: 3.5;
        filter: drop-shadow(0 0 10px var(--led))
            drop-shadow(0 0 4px color-mix(in oklab, var(--color-primary) 80%, transparent));
    }

    .led-logo-ring {
        fill: none;
        stroke: var(--led);
        stroke-width: 2;
        opacity: 0.7;
    }
    .led-logo-core {
        fill: var(--led);
        filter: drop-shadow(0 0 9px var(--led));
    }
    .led-logo.hot .led-logo-ring,
    .led-logo.sel .led-logo-ring {
        stroke-width: 3;
        opacity: 1;
    }
    .led-logo.sel {
        filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-primary) 70%, transparent));
    }

    .led-off {
        filter: none !important;
    }
    .led-breathing {
        animation: mv-breathe 2.6s ease-in-out infinite;
    }
    .led-cycle {
        animation: mv-cycle 6s linear infinite;
    }

    @keyframes mv-breathe {
        0%,
        100% {
            opacity: 0.3;
        }
        50% {
            opacity: 1;
        }
    }
    @keyframes mv-cycle {
        to {
            filter: hue-rotate(360deg);
        }
    }

    /* ── Callouts ───────────────────────────────────────────── */

    .callout {
        cursor: pointer;
        outline: none;
    }
    .callout-line {
        fill: none;
        stroke: oklch(1 0 0 / 0.16);
        stroke-width: 1;
        transition: stroke 150ms ease;
        pointer-events: none;
    }
    .callout-dot {
        fill: oklch(1 0 0 / 0.35);
        transition: fill 150ms ease;
        pointer-events: none;
    }
    .callout-role {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.09em;
        fill: oklch(1 0 0 / 0.4);
        transition: fill 150ms ease;
        pointer-events: none;
    }
    .callout-map {
        font-size: 14.5px;
        font-weight: 500;
        fill: oklch(1 0 0 / 0.85);
        transition: fill 150ms ease;
        pointer-events: none;
    }
    .callout:hover .callout-line,
    .callout.hot .callout-line,
    .callout.sel .callout-line {
        stroke: color-mix(in oklab, var(--color-primary) 60%, transparent);
    }
    .callout:hover .callout-dot,
    .callout.hot .callout-dot,
    .callout.sel .callout-dot {
        fill: var(--color-primary);
    }
    .callout:hover .callout-role,
    .callout.hot .callout-role,
    .callout.sel .callout-role {
        fill: color-mix(in oklab, var(--color-primary) 80%, transparent);
    }
    .callout.sel .callout-map {
        fill: color-mix(in oklab, var(--color-primary) 55%, white);
    }

    /* ── Extras & stats ─────────────────────────────────────── */

    .mouse-extras {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.25rem;
    }

    .extra-led-dot {
        width: 7px;
        height: 7px;
        border-radius: 9999px;
        display: inline-block;
        box-shadow: 0 0 5px currentColor;
    }

    .mouse-stats {
        display: flex;
        justify-content: center;
        gap: 1.75rem;
        padding-top: 0.25rem;
    }

    .mouse-stat {
        display: flex;
        align-items: baseline;
        gap: 0.3rem;
    }

    .mouse-stat-value {
        font-family: var(--font-mono);
        font-size: 0.85rem;
        font-weight: 600;
        color: oklch(0.92 0 0);
    }

    .mouse-stat-label {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: oklch(1 0 0 / 0.35);
    }
</style>
