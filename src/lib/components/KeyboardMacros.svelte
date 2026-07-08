<script lang="ts">
    import Icon from "$lib/components/Icon.svelte";

    // Mock macros for visual demonstration
    interface Macro {
        id: number;
        name: string;
        content: string;
        description: string;
        size: number; // bytes
    }

    let macros = $state<Macro[]>([
        { id: 0, name: "M0", content: "git status\n", description: "Runs git status in terminal", size: 11 },
        { id: 1, name: "M1", content: "npm run dev\n", description: "Starts dev server", size: 12 },
        { id: 2, name: "M2", content: "https://github.com/", description: "GitHub URL shortcut", size: 19 },
        { id: 3, name: "M3", content: "{KC_LCTL,KC_C}", description: "Ctrl+C copy combination", size: 14 },
        { id: 4, name: "M4", content: "{KC_LCTL,KC_V}", description: "Ctrl+V paste combination", size: 14 },
        { id: 5, name: "M5", content: "sudo systemctl status clackd\n", description: "Check daemon health", size: 29 },
        ...Array.from({ length: 10 }, (_, i) => ({
            id: i + 6,
            name: `M${i + 6}`,
            content: "",
            description: "Empty Macro",
            size: 0
        }))
    ]);

    let selectedMacroId = $state<number>(0);
    const selectedMacro = $derived(macros.find(m => m.id === selectedMacroId) ?? macros[0]);
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[400px]">
    <!-- Left column: list of macros -->
    <div class="md:col-span-1 border border-base-content/10 rounded-xl bg-base-300/30 backdrop-blur-md p-4 flex flex-col gap-3 min-h-0">
        <h3 class="text-sm font-bold opacity-80 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Macros</span>
            <span class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">16 Slots</span>
        </h3>
        
        <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1">
            {#each macros as macro}
                <button
                    type="button"
                    onclick={() => selectedMacroId = macro.id}
                    class="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 border {selectedMacroId === macro.id ? 'bg-primary/15 border-primary/30 text-primary font-medium shadow-md shadow-primary/5' : 'bg-transparent border-transparent hover:bg-base-content/5 hover:border-base-content/10'}"
                >
                    <div class="flex items-center gap-2.5">
                        <div class="w-2 h-2 rounded-full {macro.content ? 'bg-primary' : 'bg-base-content/25'}"></div>
                        <span class="text-sm">{macro.name}</span>
                    </div>
                    <span class="text-xs opacity-50 font-mono">
                        {macro.size > 0 ? `${macro.size} bytes` : 'empty'}
                    </span>
                </button>
            {/each}
        </div>
    </div>

    <!-- Right columns: macro editor -->
    <div class="md:col-span-2 border border-base-content/10 rounded-xl bg-base-300/30 backdrop-blur-md p-6 flex flex-col gap-6 relative overflow-hidden">
        <!-- Backend Status Notice (Glassmorphic Banner) -->
        <div class="bg-warning/10 border border-warning/20 rounded-xl p-4 flex gap-3 text-warning-content/90">
            <Icon name="info" class="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div class="flex flex-col gap-1 text-sm">
                <span class="font-bold text-warning">Backend Deferred Operation</span>
                <span>The clackd daemon does not yet have its macro fetching implementations complete. Changing macros is currently disabled until the daemon is updated.</span>
            </div>
        </div>

        <div class="flex-1 flex flex-col gap-4">
            <div class="flex justify-between items-center pb-2 border-b border-base-content/5">
                <div>
                    <h2 class="text-lg font-bold">{selectedMacro.name}</h2>
                    <p class="text-xs opacity-60 mt-0.5">{selectedMacro.description}</p>
                </div>
                <div class="text-xs opacity-50 font-mono">
                    ID: {selectedMacro.id}
                </div>
            </div>

            <!-- Content Editor Field -->
            <div class="form-control flex-1 flex flex-col">
                <label class="label pt-0" for="macro-input">
                    <span class="label-text font-semibold flex items-center gap-2 opacity-70">
                        <Icon name="file-code" class="w-4 h-4" />
                        Macro Keystrokes
                    </span>
                </label>
                <textarea
                    id="macro-input"
                    class="textarea textarea-bordered font-mono text-sm flex-1 min-h-[150px] bg-black/40 border-base-content/15 focus:border-primary/50 resize-none leading-relaxed p-4"
                    placeholder="Enter macro keys (e.g. hello, [KC_LCTL, KC_C], etc.)"
                    value={selectedMacro.content}
                    disabled
                ></textarea>
                <label class="label" for="macro-input">
                    <span class="label-text-alt opacity-40">Pressing apply will save keymap customizations. Macro string values require clackd protocol v13.</span>
                </label>
            </div>

            <div class="flex justify-end gap-3 mt-2">
                <button class="btn btn-ghost btn-sm" disabled>
                    Cancel
                </button>
                <button class="btn btn-primary btn-sm gap-1" disabled>
                    <Icon name="check" class="w-3.5 h-3.5" />
                    Save Macro
                </button>
            </div>
        </div>
    </div>
</div>
