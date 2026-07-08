<!-- KeyboardEditor — layer tabs + layout + keycode picker.
     The keyboard counterpart to the mouse DPI/Buttons/LEDs editors.
     Apply lives in the app-level context header. -->
<script lang="ts">
    import { keyboardStore } from "$lib/stores/keyboard.svelte";
    import { buildMatrixGrid } from "$lib/keyboard/matrix-grid";
    import { buildViaLayout } from "$lib/keyboard/layout";
    import { matchDefinition } from "$lib/keyboard/definitions";
    import { addToast } from "$lib/stores/toast.svelte";
    import { byteForCode } from "$lib/keycodes";
    import Icon from "$lib/components/Icon.svelte";
    import KeyboardLayout from "$lib/components/KeyboardLayout.svelte";
    import KeycodePicker from "$lib/components/KeycodePicker.svelte";
    import KeyboardLighting from "$lib/components/KeyboardLighting.svelte";
    import KeyboardMacros from "$lib/components/KeyboardMacros.svelte";

    const kb = keyboardStore;

    let activeTab: "keymap" | "lighting" | "macros" = $state("keymap");
    let selected: { row: number; col: number } | null = $state(null);

    /* Prefer the real VIA physical layout when the keyboard's VID/PID matches
       a bundled definition; otherwise fall back to the raw matrix grid. Rebuilt
       reactively whenever the active layer keymap changes (incl. optimistic
       edits). */
    const definition = $derived(
        kb.activeKeyboard?.identity
            ? matchDefinition(
                  kb.activeKeyboard.identity.vendor_id,
                  kb.activeKeyboard.identity.product_id,
              )
            : null,
    );

    const model = $derived(
        !kb.activeKeyboard
            ? null
            : definition
              ? buildViaLayout(definition, kb.activeLayerKeymap, (r, c) => byteForCode(getDefaultKeycode(r, c)) ?? 0)
              : buildMatrixGrid(
                    kb.activeKeyboard.rows,
                    kb.activeKeyboard.cols,
                    kb.activeLayerKeymap,
                    (r, c) => byteForCode(getDefaultKeycode(r, c)) ?? 0
                ),
    );

    function handlePick(keycode: number) {
        if (!selected) return;
        kb.setKey(selected.row, selected.col, keycode);
    }

    // Right-click default mapper
    function getDefaultKeycode(row: number, col: number): string {
        // Custom QWERTY mapping for GMK67/EK68 layout
        const gmk67Map: Record<string, string> = {
            // Row 0
            "0,0": "KC_ESC", "0,1": "KC_1", "0,2": "KC_2", "0,3": "KC_3", "0,4": "KC_4", "0,5": "KC_5", "0,6": "KC_6", "0,7": "KC_7", "0,8": "KC_8", "0,9": "KC_9", "0,10": "KC_0", "0,11": "KC_MINS", "0,12": "KC_EQL", "0,13": "KC_BSPC",
            // Row 1
            "1,0": "KC_TAB", "1,1": "KC_Q", "1,2": "KC_W", "1,3": "KC_E", "1,4": "KC_R", "1,5": "KC_T", "1,6": "KC_Y", "1,7": "KC_U", "1,8": "KC_I", "1,9": "KC_O", "1,10": "KC_P", "1,11": "KC_LBRC", "1,12": "KC_RBRC", "1,13": "KC_BSLS", "1,14": "KC_DEL",
            // Row 2
            "2,0": "KC_CAPS", "2,1": "KC_A", "2,2": "KC_S", "2,3": "KC_D", "2,4": "KC_F", "2,5": "KC_G", "2,6": "KC_H", "2,7": "KC_J", "2,8": "KC_K", "2,9": "KC_L", "2,10": "KC_SCLN", "2,11": "KC_QUOT", "2,12": "KC_ENT", "2,13": "KC_PGUP",
            // Row 3
            "3,0": "KC_LSFT", "3,1": "KC_Z", "3,2": "KC_X", "3,3": "KC_C", "3,4": "KC_V", "3,5": "KC_B", "3,6": "KC_N", "3,7": "KC_M", "3,8": "KC_COMM", "3,9": "KC_DOT", "3,10": "KC_SLSH", "3,11": "KC_RSFT", "3,12": "KC_UP", "3,13": "KC_PGDN",
            // Row 4
            "4,0": "KC_LCTL", "4,1": "KC_LGUI", "4,2": "KC_LALT", "4,3": "KC_SPC", "4,4": "KC_RALT", "4,5": "MO(1)", "4,6": "KC_LEFT", "4,7": "KC_DOWN", "4,8": "KC_RGHT"
        };

        const key = `${row},${col}`;
        if (gmk67Map[key]) {
            return gmk67Map[key];
        }

        // Generic matrix fallback for standard ANSI layouts
        const genericRows = [
            ["KC_ESC", "KC_1", "KC_2", "KC_3", "KC_4", "KC_5", "KC_6", "KC_7", "KC_8", "KC_9", "KC_0", "KC_MINS", "KC_EQL", "KC_BSPC"],
            ["KC_TAB", "KC_Q", "KC_W", "KC_E", "KC_R", "KC_T", "KC_Y", "KC_U", "KC_I", "KC_O", "KC_P", "KC_LBRC", "KC_RBRC", "KC_BSLS"],
            ["KC_CAPS", "KC_A", "KC_S", "KC_D", "KC_F", "KC_G", "KC_H", "KC_J", "KC_K", "KC_L", "KC_SCLN", "KC_QUOT", "KC_ENT"],
            ["KC_LSFT", "KC_Z", "KC_X", "KC_C", "KC_V", "KC_B", "KC_N", "KC_M", "KC_COMM", "KC_DOT", "KC_SLSH", "KC_RSFT"],
            ["KC_LCTL", "KC_LGUI", "KC_LALT", "KC_SPC", "KC_RALT", "KC_RGUI", "KC_APP", "KC_RCTL"]
        ];

        return genericRows[row]?.[col] ?? "KC_TRNS";
    }

    function handleRightClick(row: number, col: number, event: MouseEvent) {
        event.preventDefault();
        if (activeTab !== "keymap") return;

        const defaultCode = getDefaultKeycode(row, col);
        const defaultByte = byteForCode(defaultCode);
        if (defaultByte !== undefined) {
            kb.setKey(row, col, defaultByte);
            addToast(`Restored key to default: ${defaultCode}`, "info");
        } else {
            addToast(`Could not find byte for ${defaultCode}`, "error");
        }
    }

    function getLayerName(layer: number): string {
        if (layer === 0) return "Top Layer";
        if (layer === 1) return "Fn Layer";
        return `Layer ${layer}`;
    }
</script>

{#if kb.activeKeyboard && model}
    <div class="flex-1 flex flex-col overflow-hidden w-full h-full p-4 gap-4">
        <!-- Top Tab Bar: Keymap | Lighting | Macros -->
        <div class="flex items-center shrink-0">
            <div class="pill-group">
                <button
                    onclick={() => activeTab = 'keymap'}
                    class="pill-btn {activeTab === 'keymap' ? 'pill-btn-active' : ''} inline-flex items-center gap-1.5"
                >
                    <Icon name="keyboard" class="w-3.5 h-3.5" />
                    Keymap
                </button>
                <button
                    onclick={() => activeTab = 'lighting'}
                    class="pill-btn {activeTab === 'lighting' ? 'pill-btn-active' : ''} inline-flex items-center gap-1.5"
                >
                    <Icon name="sun" class="w-3.5 h-3.5" />
                    Lighting
                </button>
                <button
                    onclick={() => activeTab = 'macros'}
                    class="pill-btn {activeTab === 'macros' ? 'pill-btn-active' : ''} inline-flex items-center gap-1.5"
                >
                    <Icon name="file-code" class="w-3.5 h-3.5" />
                    Macros
                </button>
            </div>
        </div>

        <!-- Scrollable content area -->
        <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4">
            <!-- Keyboard Visualizer + Layer Toggle underneath -->
            <div class="flex flex-col items-center justify-center pt-2 pb-4 relative">
                {#if !model.matched}
                    <p class="text-[11px] text-base-content/40 italic mb-2">
                        No layout definition matched this keyboard — showing the raw
                        {kb.activeKeyboard.rows}×{kb.activeKeyboard.cols} matrix grid.
                        Identity: {kb.activeKeyboard?.identity ? `vid=${kb.activeKeyboard.identity.vendor_id} pid=${kb.activeKeyboard.identity.product_id}` : 'null'}.
                    </p>
                {/if}
                
                <KeyboardLayout
                    {model}
                    {selected}
                    onSelect={(row, col) => {
                        if (activeTab === 'keymap') {
                            selected = { row, col };
                        }
                    }}
                    onContextMenu={handleRightClick}
                    lighting={kb.lighting}
                />
                
                {#if activeTab === 'keymap'}
                    <div class="flex w-full items-center justify-between mt-3 px-6">
                        <p class="text-[11px] text-base-content/40 italic select-none">
                            Tip: Right-click a key to restore default assignment.
                        </p>
                        
                        <!-- Layer Toggle (Bottom Right of visualizer) -->
                        <div class="pill-group">
                            {#each Array(kb.activeKeyboard.layers) as _, layer (layer)}
                                <button
                                    type="button"
                                    onclick={() => {
                                        selected = null;
                                        kb.selectLayer(layer);
                                    }}
                                    class="pill-btn text-xs py-1 px-3 {kb.activeLayer === layer ? 'pill-btn-active' : ''}"
                                >
                                    {getLayerName(layer)}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Tab content -->
            <div class="flex-1 min-h-0">
                {#if activeTab === "keymap"}
                    <KeycodePicker enabled={selected !== null} onPick={handlePick} />
                {:else if activeTab === "lighting"}
                    <div class="bg-base-200/20 rounded-xl p-4 border border-base-content/5 h-full">
                        <KeyboardLighting />
                    </div>
                {:else if activeTab === "macros"}
                    <div class="bg-base-200/20 rounded-xl p-4 border border-base-content/5 h-full">
                        <KeyboardMacros />
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
