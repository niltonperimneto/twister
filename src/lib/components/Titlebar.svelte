<!-- CSD Titlebar — frameless window drag region (DaisyUI) -->
<script lang="ts">
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { themeStore } from "$lib/stores/theme.svelte";
    import Icon from "./Icon.svelte";

    const appWindow = getCurrentWindow();

    interface Props {
        onToggleSidebar: () => void;
        isMaximized?: boolean;
    }

    let { onToggleSidebar, isMaximized = false }: Props = $props();

    /* GNOME theme gets a real Adwaita CSD headerbar: solid bar, centered
       title, GNOME-style circular window controls (see the style block). */
    let isAdwaita = $derived(themeStore.resolvedId === "libadwaita");

    async function minimize() {
        await appWindow.minimize();
    }
    async function toggleMaximize() {
        await appWindow.toggleMaximize();
    }
    async function close() {
        await appWindow.close();
    }
</script>

<header
    data-tauri-drag-region
    class="titlebar relative flex items-center justify-between min-h-10 h-10 px-4 select-none shrink-0"
    style="border-radius: {isMaximized
        ? '0'
        : 'var(--radius-lg) var(--radius-lg) 0 0'}; background: transparent; transition: border-radius 150ms ease;"
>
    <!-- Left: sidebar drawer toggle -->
    <div class="flex items-center">
        <button
            onclick={onToggleSidebar}
            class="titlebar-btn titlebar-drawer hover:text-primary"
            aria-label="Toggle sidebar"
        >
            <Icon name="panel-left" class="w-4 h-4" />
        </button>
    </div>

    <!-- Center: Adwaita headerbar title (GNOME theme only) -->
    {#if isAdwaita}
        <div class="titlebar-title" aria-hidden="true">Twister</div>
    {/if}

    <!-- Right: window controls -->
    <div class="flex items-center gap-1.5">
        <button
            onclick={minimize}
            class="titlebar-btn window-control hover:text-primary"
            aria-label="Minimize"
        >
            <Icon name="minimize" class={isAdwaita ? "w-4 h-4" : "w-2.5 h-2.5"} />
        </button>
        <button
            onclick={toggleMaximize}
            class="titlebar-btn window-control hover:text-primary"
            aria-label="Maximize"
        >
            <Icon name="maximize" class={isAdwaita ? "w-4 h-4" : "w-2.5 h-2.5"} />
        </button>
        <button
            onclick={close}
            class="titlebar-btn window-control titlebar-btn-close"
            aria-label="Close"
        >
            <Icon name="close" class={isAdwaita ? "w-4 h-4" : "w-2.5 h-2.5"} />
        </button>
    </div>
</header>

<style>
    .titlebar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: var(--radius-full);
        border: none;
        background: transparent;
        color: color-mix(in oklab, var(--color-base-content) 82%, transparent);
        cursor: pointer;
        transition: all 150ms ease;
    }
    .titlebar-btn:hover {
        background: color-mix(in oklab, var(--color-base-content) 12%, transparent);
        color: var(--color-base-content);
    }
    .titlebar-btn-close:hover {
        background: color-mix(in oklab, var(--color-error) 25%, transparent);
        color: color-mix(in oklab, var(--color-error) 75%, var(--color-base-content));
    }

    /* ── GNOME Adwaita CSD headerbar (libadwaita theme only) ─────────── */

    /* Absolutely centered so the left/right cluster widths never shift it.
       pointer-events:none is load-bearing — Tauri's drag script requires
       e.target to carry data-tauri-drag-region, so drags over the title
       must fall through to the header. */
    .titlebar-title {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-weight: 700;
        font-size: 15px;
        color: var(--color-base-content);
        pointer-events: none;
        white-space: nowrap;
    }

    /* Solid headerbar, 46px tall, with the Adwaita 1px shade line below.
       box-shadow (not border) keeps the height exact and paints over the
       content row, matching $headerbar_shade_color. */
    :global([data-theme="libadwaita"]) .titlebar {
        height: 46px;
        min-height: 46px;
        padding-inline: 6px;
        background: var(--color-base-100);
        box-shadow: 0 1px 0 0 oklch(0 0 0 / 0.36);
    }

    /* Drawer toggle: flat 9px-radius headerbar button, currentColor wash.
       Each state restates color to out-specify the hover:text-primary
       Tailwind utility already on the button. */
    :global([data-theme="libadwaita"]) .titlebar-drawer {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-md);
        color: var(--color-base-content);
    }
    :global([data-theme="libadwaita"]) .titlebar-drawer:hover {
        background: var(--button-bg);
        color: var(--color-base-content);
    }
    :global([data-theme="libadwaita"]) .titlebar-drawer:active {
        background: color-mix(in srgb, currentColor 15%, transparent);
        color: var(--color-base-content);
    }

    /* Window controls: 24px circles with a resting 10% wash; the class+
       attribute selector out-specifies the generic .titlebar-btn-close:hover
       red rule, so close is neutral in Adwaita without touching other themes. */
    :global([data-theme="libadwaita"]) .titlebar-btn.window-control {
        width: 24px;
        height: 24px;
        background: var(--button-bg);
        color: var(--color-base-content);
    }
    :global([data-theme="libadwaita"]) .titlebar-btn.window-control:hover {
        background: var(--button-bg-hover);
        color: var(--color-base-content);
    }
    :global([data-theme="libadwaita"]) .titlebar-btn.window-control:active {
        background: color-mix(in srgb, currentColor 20%, transparent);
        color: var(--color-base-content);
    }
</style>
