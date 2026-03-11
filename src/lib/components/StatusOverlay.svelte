<!-- Disconnected / error overlay (DaisyUI) -->
<script lang="ts">
  import type { DaemonStatus } from '$lib/types';
  import { fade } from 'svelte/transition';

  interface Props {
    status: DaemonStatus;
    error: string | null;
    loading: boolean;
    onRetry: () => void;
  }

  let { status, error, loading, onRetry }: Props = $props();

  const reason: string = $derived(
    status.status === 'disconnected' ? status.reason : '',
  );
</script>

{#if status.status === 'disconnected' || error}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl"
  >
    <div class="editor-card max-w-xs w-full mx-4 text-center !p-6 !gap-4">
      <div class="flex justify-center">
        <svg class="w-10 h-10 text-error animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h2 class="text-sm font-semibold">
        {error ? 'Connection Error' : 'Daemon Disconnected'}
      </h2>

      <p class="text-xs text-base-content/60">{error ?? reason}</p>

      <div class="text-[10px] text-base-content/35">
        Ensure <code class="font-mono bg-base-300/50 px-1 py-0.5 rounded">ratbagd</code> is running:<br/>
        <code class="font-mono bg-base-300/50 px-1.5 py-0.5 rounded mt-1 inline-block">sudo systemctl start ratbagd</code>
      </div>

      <button onclick={onRetry} disabled={loading} class="pill-btn pill-btn-active mx-auto mt-1 flex items-center gap-1.5">
        {#if loading}
          <span class="loading loading-spinner loading-xs"></span> Connecting…
        {:else}
          Retry
        {/if}
      </button>
    </div>
  </div>
{/if}
