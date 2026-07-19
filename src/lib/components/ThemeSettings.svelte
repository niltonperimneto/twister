<!-- ThemeSettings — live control panel for the 8-axis ThemeConfig.
     Every control writes through themeStore.updateConfig; the store's
     $effect recompiles the CSS custom properties on the spot. Touching
     a palette axis while a preset is active forks into "Custom". -->
<script lang="ts">
    import { themeStore } from "$lib/stores/theme.svelte";
    import {
        COLOR_SCHEMES,
        DENSITIES,
        FONT_SIZES,
        ICON_THEMES,
        ROUNDNESS_VALUES,
        highlightContrast,
        type ThemeConfig,
    } from "$lib/themes";
    import { parseColor, rgbToHex } from "$lib/themes/color";
    import { exportTheme, importTheme } from "$lib/themes/io";
    import { addToast } from "$lib/stores/toast.svelte";
    import Icon from "./Icon.svelte";

    const store = themeStore;

    /* Native color inputs only speak #rrggbb; config may hold hsl(). */
    const baseHex = $derived(
        rgbToHex(parseColor(store.config.baseColor) ?? { r: 0.11, g: 0.11, b: 0.15 }),
    );
    const highlightHex = $derived(
        rgbToHex(parseColor(store.config.highlightColor) ?? { r: 0.43, g: 0.66, b: 1 }),
    );

    /* WCAG ratio of the compiled highlight over the derived surface. */
    const contrast = $derived(
        highlightContrast(store.config, store.resolvedScheme),
    );

    function pick<K extends keyof ThemeConfig>(key: K) {
        return (e: Event) =>
            store.updateConfig({
                [key]: (e.target as HTMLInputElement).value,
            } as Pick<ThemeConfig, K>);
    }

    function pickTranslucency(e: Event) {
        store.updateConfig({
            translucency: Number((e.target as HTMLInputElement).value),
        });
    }

    async function handleExport() {
        try {
            const result = await exportTheme($state.snapshot(store.config));
            if (result.status === "saved") addToast("Theme exported.", "info");
        } catch {
            addToast("Could not export the theme.");
        }
    }

    async function handleImport() {
        try {
            const result = await importTheme();
            if (result.status === "loaded") {
                store.updateConfig(result.config);
                addToast("Theme imported.", "info");
            } else if (result.status === "error") {
                addToast(`Invalid theme file: ${result.errors.join(" ")}`);
            }
        } catch {
            addToast("Could not import the theme.");
        }
    }
</script>

{#snippet row(title: string, subtext: string)}
    <div class="flex flex-col">
        <span class="text-xs font-medium text-base-content/85">{title}</span>
        <span class="text-[9px] text-base-content/40">{subtext}</span>
    </div>
{/snippet}

<div class="flex flex-col gap-2">
    <!-- Color scheme -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Color scheme", store.config.colorScheme === "system"
            ? `Follows the OS — currently ${store.systemScheme}`
            : "Fixed appearance")}
        <div class="join">
            {#each COLOR_SCHEMES as scheme (scheme)}
                <button
                    class="btn btn-xs join-item capitalize {store.config.colorScheme === scheme ? 'btn-primary' : ''}"
                    onclick={() => store.updateConfig({ colorScheme: scheme })}
                >
                    {scheme}
                </button>
            {/each}
        </div>
    </div>

    <!-- Base color -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Base color", "Backgrounds and surfaces derive from its hue")}
        <input
            type="color"
            class="w-8 h-6 rounded cursor-pointer bg-transparent"
            value={baseHex}
            oninput={pick("baseColor")}
        />
    </div>

    <!-- Highlight color -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row(
            "Highlight color",
            `Contrast ${contrast.toFixed(1)}:1${contrast < 4.5 ? " — low for text" : ""}`,
        )}
        <input
            type="color"
            class="w-8 h-6 rounded cursor-pointer bg-transparent"
            value={highlightHex}
            oninput={pick("highlightColor")}
        />
    </div>

    <!-- Density -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Density", "Global spacing and padding scale")}
        <select
            class="select select-xs bg-base-300/50 border border-base-content/10 rounded-md cursor-pointer text-xs capitalize"
            value={store.config.density}
            onchange={pick("density")}
        >
            {#each DENSITIES as density (density)}
                <option value={density}>{density}</option>
            {/each}
        </select>
    </div>

    <!-- Font size -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Font size", "Root text scale (rem)")}
        <select
            class="select select-xs bg-base-300/50 border border-base-content/10 rounded-md cursor-pointer text-xs capitalize"
            value={store.config.fontSize}
            onchange={pick("fontSize")}
        >
            {#each FONT_SIZES as size (size)}
                <option value={size}>{size}</option>
            {/each}
        </select>
    </div>

    <!-- Roundness -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Roundness", "Corners on buttons, cards, and dialogs")}
        <select
            class="select select-xs bg-base-300/50 border border-base-content/10 rounded-md cursor-pointer text-xs capitalize"
            value={store.config.roundness}
            onchange={pick("roundness")}
        >
            {#each ROUNDNESS_VALUES as roundness (roundness)}
                <option value={roundness}>{roundness}</option>
            {/each}
        </select>
    </div>

    <!-- Icon theme -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5">
        {@render row("Icon theme", "Symbolic glyph set for the whole app")}
        <select
            class="select select-xs bg-base-300/50 border border-base-content/10 rounded-md cursor-pointer text-xs capitalize"
            value={store.config.iconTheme}
            onchange={pick("iconTheme")}
        >
            {#each ICON_THEMES as icons (icons)}
                <option value={icons}>{icons === "system" ? "Match theme" : icons}</option>
            {/each}
        </select>
    </div>

    <!-- Translucency -->
    <div class="flex items-center justify-between py-1 border-b border-base-content/5 gap-4">
        {@render row("Translucency", store.config.translucency <= 0.05
            ? "Solid surfaces"
            : `Glass — ${Math.round(store.config.translucency * 100)}%`)}
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="range range-primary range-xs w-28"
            value={store.config.translucency}
            oninput={pickTranslucency}
        />
    </div>

    <!-- Import / export / reset -->
    <div class="flex items-center gap-2 pt-1">
        <button class="btn btn-xs gap-1.5 flex-1" onclick={handleImport}>
            <Icon name="file-code" class="w-3.5 h-3.5" />
            Import…
        </button>
        <button class="btn btn-xs gap-1.5 flex-1" onclick={handleExport}>
            <Icon name="external-link" class="w-3.5 h-3.5" />
            Export…
        </button>
        <button class="btn btn-ghost btn-xs" onclick={() => store.resetConfig()}>
            Reset
        </button>
    </div>
</div>
