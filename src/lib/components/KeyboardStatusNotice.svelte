<!-- KeyboardStatusNotice — non-blocking empty/disconnected state for the
     keyboard area. Unlike the full-screen StatusOverlay (which is reserved for
     ratbagd), a missing clackd must never hide the rest of the app, so this is
     just inline content. -->
<script lang="ts">
    import { keyboardStore } from "$lib/stores/keyboard.svelte";
    import Icon from "$lib/components/Icon.svelte";

    const kb = keyboardStore;
    const reason = $derived(
        kb.clackdStatus.status === "disconnected" ? kb.clackdStatus.reason : "",
    );
</script>

<div class="flex-1 flex items-center justify-center">
    <div class="text-center text-base-content/50 max-w-xs">
        <Icon name="keyboard" class="w-12 h-12 mx-auto mb-3 opacity-30" />
        {#if !kb.isConnected}
            <p class="text-lg font-medium">clackd not connected</p>
            <p class="text-xs mt-1 opacity-60">
                Start the keyboard daemon to configure keyboards:
            </p>
            <code
                class="font-mono text-[11px] bg-base-300/50 px-1.5 py-0.5 rounded mt-2 inline-block"
                >systemctl --user start clackd</code
            >
            {#if reason}
                <p class="text-[10px] mt-2 opacity-40">{reason}</p>
            {/if}
        {:else}
            <p class="text-lg font-medium">No keyboards detected</p>
            <p class="text-xs mt-1 opacity-60">
                Connect a supported VIA keyboard and it will appear here.
            </p>
        {/if}
    </div>
</div>
