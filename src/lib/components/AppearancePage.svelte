<!-- AppearancePage — dedicated theming configuration view.
     Hosts everything look-and-feel related: the preset theme picker
     (system-detected or explicit), the system-accent toggle, and the
     8-axis custom theme engine (ThemeSettings). Reached from the
     sidebar's Appearance entry. -->
<script lang="ts">
    import { fade } from "svelte/transition";
    import { DUR, duration } from "$lib/motion";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { themeList, themes } from "$lib/themes";
    import Icon from "./Icon.svelte";
    import ThemeSettings from "./ThemeSettings.svelte";

    function handleThemeChange(e: Event) {
        themeStore.setTheme((e.target as HTMLSelectElement).value);
    }

    function handleFollowAccentChange(e: Event) {
        themeStore.setFollowSystemAccent((e.target as HTMLInputElement).checked);
    }
</script>

<div
    class="flex-1 flex justify-center p-8 overflow-y-auto"
    in:fade={{ duration: duration(DUR.base) }}
    out:fade={{ duration: 150 }}
>
    <div class="max-w-md w-full flex flex-col gap-6 my-auto">
        <div class="editor-card w-full p-6 gap-4 text-left">
            <!-- Header -->
            <div class="flex items-center gap-2.5">
                <Icon name="palette" class="w-4 h-4 text-base-content/60" />
                <div class="flex flex-col">
                    <h1 class="text-sm font-bold tracking-wide">Appearance</h1>
                    <span class="text-[10px] text-base-content/45">
                        Theme, colors, density and icons — applied live
                    </span>
                </div>
            </div>

            <div class="border-t border-base-content/5"></div>

            <!-- Preset theme picker -->
            <div class="flex items-center justify-between py-1 border-b border-base-content/5">
                <div class="flex flex-col">
                    <span class="text-xs font-medium text-base-content/85">Theme</span>
                    <span class="text-[9px] text-base-content/40">
                        {#if themeStore.selection === "system"}
                            Follows your desktop environment — detected: {themes[themeStore.resolvedId]?.name ?? themeStore.resolvedId}
                        {:else if themeStore.selection === "custom"}
                            Your own look — tune it below
                        {:else}
                            {themes[themeStore.resolvedId]?.description ?? ""}
                        {/if}
                    </span>
                </div>
                <select
                    class="select select-xs bg-base-300/50 border border-base-content/10 rounded-md cursor-pointer text-xs"
                    value={themeStore.selection}
                    onchange={handleThemeChange}
                >
                    <option value="system">System (auto)</option>
                    {#each themeList as theme (theme.id)}
                        <option value={theme.id}>{theme.name}</option>
                    {/each}
                    <option value="custom">Custom</option>
                </select>
            </div>

            <!-- System accent (presets only — custom uses its own highlight) -->
            <div class="flex items-center justify-between py-1 border-b border-base-content/5">
                <div class="flex flex-col">
                    <span class="text-xs font-medium text-base-content/85">Follow system accent</span>
                    <span class="text-[9px] text-base-content/40">
                        {#if themeStore.selection === "custom"}
                            Not used by the custom theme — your highlight color wins
                        {:else if themeStore.systemAccent}
                            Re-tints the theme with your desktop's accent color
                        {:else}
                            No system accent detected — using the theme's own accent
                        {/if}
                    </span>
                </div>
                <input
                    type="checkbox"
                    class="toggle toggle-primary toggle-xs cursor-pointer"
                    checked={themeStore.followSystemAccent}
                    disabled={themeStore.selection === "custom"}
                    onchange={handleFollowAccentChange}
                />
            </div>

            <!-- 8-axis custom theme engine -->
            <ThemeSettings />
        </div>
    </div>
</div>
