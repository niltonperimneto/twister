<!-- Disconnected / error overlay (DaisyUI) -->
<script lang="ts">
    import type { DaemonStatus } from "$lib/types";
    import { fade } from "svelte/transition";
    import { DUR, duration } from "$lib/motion";
    import Icon from "./Icon.svelte";

    interface Props {
        status: DaemonStatus;
        error: string | null;
        loading: boolean;
        onRetry: () => void;
    }

    let { status, error, loading, onRetry }: Props = $props();

    const reason: string = $derived(
        status.status === "disconnected" ? status.reason : "",
    );
</script>

{#if status.status === "disconnected" || error}
    <div
        transition:fade={{ duration: duration(DUR.fast) }}
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        style="backdrop-filter: var(--backdrop-blur); -webkit-backdrop-filter: var(--backdrop-blur);"
    >
        <div class="editor-card max-w-xs w-full mx-4 text-center p-6! gap-4!">
            <div class="flex justify-center">
                <Icon name="alert-circle" class="w-10 h-10 text-error animate-pulse" />
            </div>

            <h2 class="text-sm font-semibold">
                {error ? "Connection Error" : "Daemon Disconnected"}
            </h2>

            <p class="text-xs text-base-content/60">{error ?? reason}</p>

            <div class="text-[10px] text-base-content/35">
                Ensure <code
                    class="font-mono bg-base-300/50 px-1 py-0.5 rounded"
                    >ratbagd</code
                >
                is running:<br />
                <code
                    class="font-mono bg-base-300/50 px-1.5 py-0.5 rounded mt-1 inline-block"
                    >systemctl --user start ratbagd</code
                >
                <span class="opacity-60">(libratbag-rs)</span><br />
                <code
                    class="font-mono bg-base-300/50 px-1.5 py-0.5 rounded mt-1 inline-block"
                    >sudo systemctl start ratbagd</code
                >
                <span class="opacity-60">(legacy)</span>
            </div>

            <button
                onclick={onRetry}
                disabled={loading}
                class="pill-btn pill-btn-active mx-auto mt-1 flex items-center gap-1.5"
            >
                {#if loading}
                    <span class="loading loading-spinner loading-xs"></span> Connecting…
                {:else}
                    Retry
                {/if}
            </button>
        </div>
    </div>
{/if}
