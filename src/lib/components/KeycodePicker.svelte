<!-- KeycodePicker — category pills + searchable grid of assignable keycodes,
     driven by the full vendored VIA keycode tables. Clicking a keycode resolves
     its symbolic code to a u16 and applies it to the selected key. Layer
     keycodes (MO/TG/TT/OSL/TO/DF) are pre-expanded for layers 0-9 by VIA, so
     they appear as plain entries. Macro/custom/lighting categories that require
     text entry are deferred (Phases 4/5) and omitted here. -->
<script lang="ts">
    import {
        keycodeMenus,
        byteForCode,
        type IKeycode,
        type IKeycodeMenu,
    } from "$lib/keycodes";

    interface Props {
        /** Disabled until a key on the layout is selected. */
        enabled: boolean;
        onPick: (keycode: number) => void;
    }

    let { enabled, onPick }: Props = $props();

    /* Keymap-relevant categories only (P3). Lighting/macro/custom are later. */
    const ALLOWED = new Set(["basic", "layers", "media", "special"]);
    const menus: IKeycodeMenu[] = keycodeMenus.filter((m) => ALLOWED.has(m.id));

    let activeCategory: string = $state(menus[0]?.id ?? "basic");
    let search: string = $state("");

    /* An entry is assignable when it resolves to a real byte and is not a
     * text/container input (macros, custom hex — handled in later phases). */
    function assignable(kc: IKeycode): boolean {
        if (kc.type === "text" || kc.type === "container") return false;
        return byteForCode(kc.code) !== undefined;
    }

    const current = $derived(
        menus.find((m) => m.id === activeCategory) ?? menus[0],
    );

    /* When searching, match by name/code/title across all allowed categories;
     * otherwise show the active category. Only assignable entries are shown. */
    const shown = $derived.by(() => {
        const q = search.trim().toLowerCase();
        const pool = q
            ? menus.flatMap((m) => m.keycodes)
            : (current?.keycodes ?? []);
        const seen = new Set<string>();
        return pool.filter((kc) => {
            if (!assignable(kc) || seen.has(kc.code)) return false;
            if (q) {
                const hay = `${kc.name} ${kc.code} ${kc.title ?? ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            seen.add(kc.code);
            return true;
        });
    });

    function pick(kc: IKeycode) {
        const byte = byteForCode(kc.code);
        if (byte !== undefined) onPick(byte);
    }
</script>

<div class="editor-card">
    <div class="editor-card-header flex items-center justify-between gap-3">
        <span>Keycodes</span>
        <input
            type="search"
            bind:value={search}
            placeholder="Search…"
            class="input input-xs input-bordered w-40 font-normal"
        />
    </div>

    {#if !search.trim()}
        <div class="pill-group flex-wrap mb-3">
            {#each menus as cat (cat.id)}
                <button
                    type="button"
                    onclick={() => (activeCategory = cat.id)}
                    class="pill-btn {activeCategory === cat.id
                        ? 'pill-btn-active'
                        : ''}"
                >
                    {cat.label}
                </button>
            {/each}
        </div>
    {/if}

    <div
        class="grid gap-1.5 {enabled ? '' : 'opacity-40 pointer-events-none'}"
        style="grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));"
    >
        {#each shown as kc (kc.code)}
            <button
                type="button"
                onclick={() => pick(kc)}
                title={kc.title ?? kc.code}
                class="kc-btn"
            >
                {kc.name}
            </button>
        {/each}
    </div>

    {#if shown.length === 0}
        <p class="text-[11px] text-base-content/40 mt-3 italic">
            No keycodes match “{search}”.
        </p>
    {:else if !enabled}
        <p class="text-[11px] text-base-content/40 mt-3 italic">
            Select a key on the layout to assign a keycode.
        </p>
    {/if}
</div>

<style>
    .kc-btn {
        height: 38px;
        border-radius: var(--radius-sm, 6px);
        border: 1px solid oklch(1 0 0 / 0.05);
        background: linear-gradient(
            to bottom,
            color-mix(in oklab, var(--color-base-content) 14%, transparent),
            color-mix(in oklab, var(--color-base-content) 9%, transparent)
        );
        color: oklch(0.92 0 0);
        font-size: 10px;
        line-height: 1.1;
        white-space: pre-line;
        text-align: center;
        padding: 2px;
        overflow: hidden;
        cursor: pointer;
        box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.05);
        transition: all var(--dur-fast) var(--ease-out);
    }
    .kc-btn:hover {
        border-color: color-mix(in oklab, var(--color-primary) 35%, transparent);
        background: color-mix(in oklab, var(--color-primary) 35%, var(--color-base-300));
    }
    .kc-btn:active {
        transform: scale(0.95);
    }
</style>
