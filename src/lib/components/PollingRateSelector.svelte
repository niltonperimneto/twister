<!-- Polling rate — compact always-visible strip, independent of the tabs -->
<script lang="ts">
  import type { ProfileDto } from '$lib/types';
  import { setProfileReportRate } from '$lib/ipc/commands';
  import { addToast } from '$lib/stores/toast.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    profile: ProfileDto;
    onUpdated: () => void;
  }

  let { profile, onUpdated }: Props = $props();

  /* Editable mirror of the daemon value; while a write is in flight the
   * prop->local resync is suppressed so the optimistic value isn't
   * clobbered by a stale refresh. */
  let localReportRate: number = $state(0);
  let pending: boolean = $state(false);

  $effect(() => {
    const rate = profile.report_rate;
    if (pending) return;
    localReportRate = rate;
  });

  function snap(value: number, allowed: number[]): number {
    if (allowed.length === 0) return value;
    return allowed.reduce((best, v) =>
      Math.abs(v - value) < Math.abs(best - value) ? v : best,
    );
  }

  async function handleReportRateChange(rate: number) {
    const snapped = snap(rate, profile.report_rates);
    pending = true;
    localReportRate = snapped;
    try {
      await setProfileReportRate(profile.path, snapped);
      await onUpdated();
    } catch (e) {
      console.error('Report rate write failed:', e);
      addToast(`Report rate write failed: ${e}`);
      localReportRate = profile.report_rate;
    } finally {
      pending = false;
    }
  }
</script>

<div class="editor-card flex-row! items-center gap-3 py-2.5! px-4!">
  <h3 class="text-sm font-medium flex items-center gap-2 shrink-0">
    <Icon name="clock" class="w-3.5 h-3.5 opacity-60" />
    Polling Rate
  </h3>
  {#if profile.report_rates.length > 0}
    <div class="pill-group ml-auto justify-end">
      {#each profile.report_rates as rate (rate)}
        <button
          onclick={() => handleReportRateChange(rate)}
          class="pill-btn {localReportRate === rate ? 'pill-btn-active' : ''}"
        >
          {rate} Hz
        </button>
      {/each}
    </div>
  {:else}
    <span class="text-xs text-base-content/35 italic ml-auto">
      {localReportRate} Hz · fixed
    </span>
  {/if}
</div>
