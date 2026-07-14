<!-- CSD Titlebar — frameless window drag region (DaisyUI) -->
<script lang="ts">
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import Icon from "./Icon.svelte";

    const appWindow = getCurrentWindow();

    interface Props {
        onToggleSidebar: () => void;
        isMaximized?: boolean;
    }

    let { onToggleSidebar, isMaximized = false }: Props = $props();

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
    class="flex items-center justify-between min-h-10 h-10 px-4 select-none shrink-0"
    style="border-radius: {isMaximized
        ? '0'
        : 'var(--radius-lg) var(--radius-lg) 0 0'}; background: transparent; transition: border-radius 150ms ease;"
>
    <!-- Left: hamburger -->
    <div class="flex items-center">
        <button
            onclick={onToggleSidebar}
            class="titlebar-btn hover:text-primary"
            aria-label="Toggle sidebar"
        >
            <Icon name="panel-left" class="w-4 h-4" />
        </button>
    </div>

    <!-- Right: window controls -->
    <div class="flex items-center gap-1.5">
        <button
            onclick={minimize}
            class="titlebar-btn hover:text-primary"
            aria-label="Minimize"
        >
            <Icon name="minimize" class="w-2.5 h-2.5" />
        </button>
        <button
            onclick={toggleMaximize}
            class="titlebar-btn hover:text-primary"
            aria-label="Maximize"
        >
            <Icon name="maximize" class="w-2.5 h-2.5" />
        </button>
        <button
            onclick={close}
            class="titlebar-btn titlebar-btn-close"
            aria-label="Close"
        >
            <Icon name="close" class="w-2.5 h-2.5" />
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
</style>
