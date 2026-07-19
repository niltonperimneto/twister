<!-- Shared SVG icon component — glyphs live in $lib/icons. The user's
     iconTheme config wins when set; otherwise the active theme picks
     its symbolic set (Breeze/Adwaita/COSMIC) and any glyph a set lacks
     falls back to the default Lucide-style set. -->
<script lang="ts">
    import { themeStore } from "$lib/stores/theme.svelte";
    import { themes } from "$lib/themes";
    import { iconSets, defaultIconSet, type IconName } from "$lib/icons";

    interface Props {
        name: IconName;
        class?: string;
    }
    let { name, class: cls = "w-4 h-4" }: Props = $props();

    const resolved = $derived.by(() => {
        const choice = themeStore.config.iconTheme;
        const setId =
            choice === "system"
                ? themes[themeStore.resolvedId]?.icons
                : choice === "default"
                  ? undefined
                  : choice;
        const set = setId ? iconSets[setId] : defaultIconSet;
        const glyph = set.glyphs[name];
        if (glyph) return { set, glyph };
        /* default set is complete by construction (Record<IconName, …>) */
        return { set: defaultIconSet, glyph: defaultIconSet.glyphs[name]! };
    });
</script>

<!-- Glyph bodies are our own committed constants, so {@html} is safe. -->
<svg
    class={cls}
    viewBox={resolved.glyph.viewBox ?? resolved.set.viewBox}
    {...resolved.set.attrs}
    aria-hidden="true"
>
    {@html resolved.glyph.body}
</svg>
