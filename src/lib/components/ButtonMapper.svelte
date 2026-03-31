<!-- Button Mapping editor -->
<script lang="ts">
    import type { ProfileDto, ButtonDto, ActionValueDto } from "$lib/types";
    import { ACTION_TYPES, COMMON_BUTTONS, SPECIAL_ACTIONS } from "$lib/types";
    import { setButtonMapping } from "$lib/ipc/commands";
    import { addToast } from "$lib/stores/toast.svelte";

    interface Props {
        profile: ProfileDto;
        deviceModel: string;
        selectedSvgId: string | null;
        onSvgSelect: (id: string) => void;
        onUpdated: () => void;
    }

    let { profile, deviceModel, selectedSvgId, onSvgSelect, onUpdated }: Props =
        $props();

    let editIdx: number | null = $state(null);
    let editActionType: number = $state(1);
    let editValue: string = $state("");

    function buttonLabel(index: number): string {
        return COMMON_BUTTONS[index+1] ?? `Button ${index}`;
    }

    $effect(() => {
        if (selectedSvgId?.startsWith("button")) {
            const idx = parseInt(selectedSvgId.replace("button", ""), 10);
            if (!isNaN(idx) && profile.buttons.some((b) => b.index === idx)) {
                startEdit(profile.buttons.find((b) => b.index === idx)!);
            }
        }
    });

    function formatAction(btn: ButtonDto): string {
        const v = btn.action_value;
        switch (v.kind) {
            case "none":
                return "None";
            case "button":
                return COMMON_BUTTONS[v.button] ?? `Button ${v.button}`;
            case "special":
                return SPECIAL_ACTIONS[v.special] ?? `Special ${v.special}`;
            case "key":
                return `Key ${v.keycode}`;
            case "macro":
                return `Macro (${v.entries.length} steps)`;
            case "unknown":
                return "Unknown";
            default:
                return "\u2014";
        }
    }

    function startEdit(btn: ButtonDto) {
        editIdx = btn.index;
        editActionType = btn.action_type;
        editValue =
            btn.action_value.kind === "button"
                ? String(btn.action_value.button)
                : btn.action_value.kind === "key"
                  ? String(btn.action_value.keycode)
                  : btn.action_value.kind === "special"
                    ? String(btn.action_value.special)
                    : "";
        macroEntries =
            btn.action_value.kind === "macro"
                ? [...btn.action_value.entries]
                : [];
        onSvgSelect(`button${btn.index}`);
    }

    function cancelEdit() {
        stopMacroRecord();
        editIdx = null;
    }

    async function applyEdit() {
        const btn = profile.buttons.find((b) => b.index === editIdx);
        if (!btn) return;

        let value: ActionValueDto;
        const n = parseInt(editValue, 10) || 0;

        switch (editActionType) {
            case 0:
                value = { kind: "none" };
                break;
            case 1:
                value = { kind: "button", button: n };
                break;
            case 2:
                value = { kind: "special", special: n };
                break;
            case 3:
                value = { kind: "key", keycode: n };
                break;
            case 4:
                value = { kind: "macro", entries: [...macroEntries] };
                break;
            default:
                value = { kind: "unknown" };
                break;
        }

        try {
            await setButtonMapping(btn.path, editActionType, value);
            onUpdated();
        } catch (e) {
            console.error("Button mapping failed:", e);
            addToast("Button mapping failed. Check daemon connection");
        }
        stopMacroRecord();
        editIdx = null;
    }

    /* ── Macro recording ───────────────────────────────────── */

    let macroEntries: [number, number][] = $state([]);
    let macroRecording: boolean = $state(false);
    let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    function toggleMacroRecord() {
        if (macroRecording) {
            stopMacroRecord();
        } else {
            startMacroRecord();
        }
    }

    function startMacroRecord() {
        macroRecording = true;
        keydownHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            /* e.keyCode is intentionally used here: the ActionValueDto wire format
             * expects a numeric keycode to pass through to the ratbagd backend.
             * e.key would give a string ("ArrowUp") which doesn't map to the protocol. */
            macroEntries = [...macroEntries, [e.keyCode, 0]];
        };
        window.addEventListener("keydown", keydownHandler, true);
    }

    function stopMacroRecord() {
        macroRecording = false;
        if (keydownHandler) {
            window.removeEventListener("keydown", keydownHandler, true);
            keydownHandler = null;
        }
    }

    function clearMacro() {
        macroEntries = [];
    }

    function removeMacroEntry(index: number) {
        macroEntries = macroEntries.filter((_, i) => i !== index);
    }

    /* Human-readable labels for common keycodes (display only). */
    const KEY_LABELS: Record<number, string> = {
        8: "Backspace",
        9: "Tab",
        13: "Enter",
        16: "Shift",
        17: "Ctrl",
        18: "Alt",
        19: "Pause",
        20: "CapsLk",
        27: "Esc",
        32: "Space",
        33: "PgUp",
        34: "PgDn",
        35: "End",
        36: "Home",
        37: "←",
        38: "↑",
        39: "→",
        40: "↓",
        45: "Ins",
        46: "Del",
        91: "Meta",
        93: "Menu",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        119: "F8",
        120: "F9",
        121: "F10",
        122: "F11",
        123: "F12",
    };

    function keyLabel(code: number): string {
        if (KEY_LABELS[code]) return KEY_LABELS[code];
        /* Printable ASCII range */
        if (code >= 32 && code <= 126) return String.fromCharCode(code);
        return String(code);
    }
</script>

<div class="flex flex-col gap-3">
    {#if profile.buttons.length === 0}
        <p class="text-xs text-base-content/35 italic">No buttons configured</p>
    {/if}

    {#each profile.buttons as btn (btn.index)}
        {@const isEditing = editIdx === btn.index}
        {@const isSelected = selectedSvgId === `button${btn.index}`}
        <div class="editor-card group {isSelected ? 'border-primary/40!' : ''}">
            <div class="editor-card-header">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span
                        class="flex items-center justify-center w-7 h-7 rounded-lg bg-base-300/40 text-[11px] font-mono font-bold text-base-content/60 shrink-0"
                    >
                        {btn.index}
                    </span>
                    <div class="min-w-0">
                        <div class="text-sm truncate">
                            {buttonLabel(btn.index)}: {formatAction(btn)}
                        </div>
                        <div class="text-[10px] text-base-content/30">
                            {ACTION_TYPES[btn.action_type] ?? "Unknown"}
                        </div>
                    </div>
                </div>

                {#if !isEditing}
                    <button
                        onclick={() => startEdit(btn)}
                        class="pill-btn text-[11px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                        Edit
                    </button>
                {/if}
            </div>

            {#if isEditing}
                <div
                    class="flex flex-col gap-3 pt-2 border-t border-base-300/20"
                >
                    <!-- Action-type pill toggles -->
                    <div class="flex flex-col gap-1.5">
                        <span
                            class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold"
                            >Action Type</span
                        >
                        <div class="pill-group">
                            {#each btn.action_types as at (at)}
                                <button
                                    class="pill-btn {editActionType === at
                                        ? 'pill-btn-active'
                                        : ''}"
                                    onclick={() => {
                                        editActionType = at;
                                        editValue = "";
                                    }}
                                >
                                    {ACTION_TYPES[at] ?? `Type ${at}`}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Value selectors based on active type -->
                    <div class="flex flex-wrap items-center gap-2">
                        {#if editActionType === 1}
                            <select
                                bind:value={editValue}
                                class="select select-bordered select-xs bg-base-300/30 border-base-300/40 text-xs w-36"
                            >
                                <option value="" disabled>Select button</option>
                                {#each Object.entries(COMMON_BUTTONS) as [id, label]}
                                    <option value={id}>{label}</option>
                                {/each}
                            </select>
                        {:else if editActionType === 2}
                            <select
                                bind:value={editValue}
                                class="select select-bordered select-xs bg-base-300/30 border-base-300/40 text-xs w-48"
                            >
                                <option value="" disabled>Select action</option>
                                {#each Object.entries(SPECIAL_ACTIONS) as [id, label]}
                                    <option value={id}>{label}</option>
                                {/each}
                            </select>
                        {:else if editActionType === 3}
                            <input
                                type="number"
                                bind:value={editValue}
                                class="input input-bordered input-xs w-20 font-mono bg-base-300/30 border-base-300/40"
                                min="0"
                                placeholder="Keycode"
                            />
                        {/if}

                        {#if editActionType === 4}
                            <!-- Macro recorder (frosted glass) -->
                            <div class="macro-recorder w-full">
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <span
                                        class="text-[10px] uppercase tracking-widest text-base-content/30 font-semibold"
                                        >Macro Recorder</span
                                    >
                                    <div class="flex gap-1">
                                        <button
                                            class="pill-btn text-[11px] {macroRecording
                                                ? 'pill-btn-active'
                                                : ''}"
                                            onclick={toggleMacroRecord}
                                        >
                                            {macroRecording
                                                ? "⏹ Stop"
                                                : "⏺ Record"}
                                        </button>
                                        <button
                                            class="pill-btn text-[11px]"
                                            onclick={clearMacro}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {#if macroEntries.length === 0}
                                    <p
                                        class="text-[11px] text-base-content/30 italic text-center py-3"
                                    >
                                        {macroRecording
                                            ? "Press keys to record…"
                                            : "Click Record and press keys"}
                                    </p>
                                {:else}
                                    <div class="macro-entries">
                                        {#each macroEntries as entry, i (i)}
                                            <div class="macro-entry">
                                                <kbd class="kbd kbd-xs"
                                                    >{keyLabel(entry[0])}</kbd
                                                >
                                                <button
                                                    class="text-[10px] text-base-content/25 hover:text-red-400 transition-colors"
                                                    onclick={() =>
                                                        removeMacroEntry(i)}
                                                    >✕</button
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <div class="flex gap-1 ml-auto">
                        <button
                            onclick={applyEdit}
                            class="pill-btn pill-btn-active text-[11px]"
                            >Apply</button
                        >
                        <button
                            onclick={cancelEdit}
                            class="pill-btn text-[11px]">Cancel</button
                        >
                    </div>
                </div>
            {/if}
        </div>
    {/each}
</div>
