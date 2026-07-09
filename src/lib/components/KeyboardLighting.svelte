<script lang="ts">
    import { keyboardStore } from "$lib/stores/keyboard.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import {
        RGB_MATRIX_EFFECTS,
        rgbMatrixEffectHasColor,
        rgbMatrixEffectHasSpeed,
    } from "$lib/keyboard/rgb-matrix-effects";

    const kb = keyboardStore;

    // Which lighting wire protocol the active keyboard speaks. Legacy polyfill
    // boards (e.g. GMK67/EK68) use vendor effect numbering; native VIA boards
    // use the standard RGB-Matrix effect catalogue.
    const isVia = $derived(kb.lightingProtocol === "via");
    const mode = $derived(kb.lighting?.[0] ?? 1);

    // "Off" is effect 0 (All Off) on VIA / RGB-Matrix, but 128 on the legacy
    // GMK67 blob protocol.
    const isOff = $derived(isVia ? mode === 0 : mode === 128);

    // Legacy GMK67/EK68 vendor effect numbering (modes 0x01..0x13 + 0x80 Off).
    const LEGACY_EFFECTS = [
        { id: 1, name: "Static" },
        { id: 2, name: "Keystroke light-up" },
        { id: 3, name: "Keystroke dim" },
        { id: 4, name: "Sparkle" },
        { id: 5, name: "Rain" },
        { id: 6, name: "Random colors" },
        { id: 7, name: "Breathing" },
        { id: 8, name: "Spectrum cycle" },
        { id: 9, name: "Ring gradient" },
        { id: 10, name: "Vertical gradient" },
        { id: 11, name: "Horizontal gradient / Rainbow wave" },
        { id: 12, name: "Around edges" },
        { id: 13, name: "Keystroke horizontal lines" },
        { id: 14, name: "Keystroke tilted lines" },
        { id: 15, name: "Keystroke ripples" },
        { id: 16, name: "Sequence" },
        { id: 17, name: "Wave line" },
        { id: 18, name: "Tilted lines" },
        { id: 19, name: "Back-and-forth" },
        { id: 128, name: "Off" },
    ];

    // Effect dropdown options, sourced per protocol. For VIA the index is the
    // firmware effect id; for legacy the bespoke GMK67 ids are used.
    const effects = $derived(
        isVia
            ? RGB_MATRIX_EFFECTS.map((name, id) => ({ id, name }))
            : LEGACY_EFFECTS,
    );

    // Control availability. VIA mirrors the qmk_rgb_matrix menu showIf rules;
    // legacy keeps the GMK67-specific disable rules.
    const colorDisabled = $derived(
        isVia
            ? !rgbMatrixEffectHasColor(mode)
            : mode === 128 || mode === 6 || mode === 8,
    );
    const speedDisabled = $derived(
        isVia ? !rgbMatrixEffectHasSpeed(mode) : mode === 128 || mode === 1,
    );
    const brightnessDisabled = $derived(isVia ? mode === 0 : mode === 128);

    // Local state for sliders so they don't stutter while dragging
    let localBrightness = $state(0);
    let localSpeed = $state(0);
    let localR = $state(0);
    let localG = $state(0);
    let localB = $state(0);

    // Sync local state when store lighting changes
    $effect(() => {
        if (kb.lighting) {
            localR = kb.lighting[1] ?? 0;
            localG = kb.lighting[2] ?? 0;
            localB = kb.lighting[3] ?? 0;
            localBrightness = kb.lighting[4] ?? 15;
            localSpeed = kb.lighting[6] ?? 0;
        }
    });

    function handleModeChange(e: Event) {
        if (!kb.lighting) return;
        const select = e.target as HTMLSelectElement;
        const newMode = parseInt(select.value, 10);
        const data = [...kb.lighting];
        data[0] = newMode;
        kb.updateLighting(data);
    }

    function handleColorChange(e: Event) {
        if (!kb.lighting) return;
        const input = e.target as HTMLInputElement;
        const hex = input.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        localR = r;
        localG = g;
        localB = b;
        
        const data = [...kb.lighting];
        data[1] = r;
        data[2] = g;
        data[3] = b;
        kb.updateLighting(data);
    }

    function handleBrightnessChange(e: Event) {
        if (!kb.lighting) return;
        const input = e.target as HTMLInputElement;
        const val = parseInt(input.value, 10);
        localBrightness = val;
        
        const data = [...kb.lighting];
        data[4] = val;
        kb.updateLighting(data);
    }

    function handleSpeedChange(e: Event) {
        if (!kb.lighting) return;
        const input = e.target as HTMLInputElement;
        const val = parseInt(input.value, 10);
        localSpeed = val;
        
        const data = [...kb.lighting];
        data[6] = val;
        kb.updateLighting(data);
    }

    // Helper to format rgb to hex for color input
    function rgbToHex(r: number, g: number, b: number) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    }
</script>

<div class="flex flex-col gap-6 max-w-lg mx-auto py-4">
    {#if isVia && !kb.lightingSupported}
        <!-- Native VIA board whose lighting clackd can't drive (e.g. a
             qmk_rgblight board — clackd currently supports only the RGB-Matrix
             custom channel). -->
        <div class="alert alert-info text-sm">
            <Icon name="info" class="w-4 h-4 shrink-0" />
            <span>
                This keyboard's lighting isn't controllable through the daemon
                yet. clackd currently drives only RGB-Matrix (per-key) lighting;
                support for RGBLIGHT/backlight boards is planned.
            </span>
        </div>
    {:else if kb.lighting}
        <!-- Effect Mode -->
        <div class="form-control">
            <label class="label">
                <span class="label-text font-semibold flex items-center gap-2">
                    <Icon name="wand-2" class="w-4 h-4 opacity-70" />
                    Effect
                </span>
            </label>
            <select class="select select-bordered select-sm w-full" value={mode} onchange={handleModeChange}>
                {#each effects as effect}
                    <option value={effect.id}>{effect.name}</option>
                {/each}
            </select>
        </div>

        <!-- Color -->
        <div class="form-control">
            <label class="label">
                <span class="label-text font-semibold flex items-center gap-2">
                    <Icon name="palette" class="w-4 h-4 opacity-70" />
                    Color
                </span>
            </label>
            <div class="flex gap-3 items-center">
                <input
                    type="color"
                    class="w-10 h-10 p-0 border-0 rounded-md cursor-pointer bg-transparent"
                    value={rgbToHex(localR, localG, localB)}
                    onchange={handleColorChange}
                    disabled={colorDisabled}
                />
                <span class="text-sm opacity-60">
                    {#if isOff}
                        Lighting is off
                    {:else if colorDisabled}
                        Color is automatically animated
                    {:else}
                        Base color for effect
                    {/if}
                </span>
            </div>
        </div>

        <!-- Brightness -->
        <div class="form-control">
            <label class="label">
                <span class="label-text font-semibold flex items-center gap-2">
                    <Icon name="sun" class="w-4 h-4 opacity-70" />
                    Brightness
                </span>
                <span class="text-xs opacity-50">{localBrightness} / 15</span>
            </label>
            <input
                type="range"
                min="0"
                max="15"
                class="slider"
                value={localBrightness}
                onchange={handleBrightnessChange}
                disabled={brightnessDisabled}
            />
            <div class="w-full flex justify-between text-xs px-1 pt-1 opacity-40">
                <span>Off</span>
                <span>Max</span>
            </div>
        </div>

        <!-- Speed -->
        <div class="form-control">
            <label class="label">
                <span class="label-text font-semibold flex items-center gap-2">
                    <Icon name="gauge" class="w-4 h-4 opacity-70" />
                    Speed
                </span>
                <span class="text-xs opacity-50">{localSpeed} / 15</span>
            </label>
            <input
                type="range"
                min="0"
                max="15"
                class="slider"
                value={localSpeed}
                onchange={handleSpeedChange}
                disabled={speedDisabled}
            />
            <div class="w-full flex justify-between text-xs px-1 pt-1 opacity-40">
                <span>Slow</span>
                <span>Fast</span>
            </div>
        </div>
    {/if}
</div>
