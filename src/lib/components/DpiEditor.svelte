<!-- DPI & Polling Rate editor -->
<script lang="ts">
  import type { ProfileDto, ResolutionDto } from '$lib/types';
  import {
    setResolutionDpi,
    setResolutionActive,
    setProfileReportRate,
  } from '$lib/ipc/commands';
  import { addToast } from '$lib/stores/toast.svelte';

  interface Props {
    profile: ProfileDto;
    onUpdated: () => void;
  }

  let { profile, onUpdated }: Props = $props();

  let localReportRate: number = $state(0);
  let localDpis: number[] = $state([]);
  let lastProfilePath = '';

  $effect(() => {
    if (profile.path === lastProfilePath) return;
    lastProfilePath = profile.path;
    localReportRate = profile.report_rate;
    localDpis = profile.resolutions.map((r) => r.dpi_x);
  });

  function snap(value: number, allowed: number[]): number {
    if (allowed.length === 0) return value;
    return allowed.reduce((best, v) =>
      Math.abs(v - value) < Math.abs(best - value) ? v : best,
    );
  }

  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedDpiWrite(res: ResolutionDto, value: number) {
    const snapped = snap(value, res.dpi_list);
    localDpis[res.index] = snapped;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        await setResolutionDpi(res.path, snapped, null);
        onUpdated();
      } catch (e) {
        console.error('DPI write failed:', e);
        addToast('DPI write failed');
        localDpis[res.index] = profile.resolutions[res.index]?.dpi_x ?? snapped;
      }
    }, 150);
  }

  async function handleReportRateChange(rate: number) {
    const snapped = snap(rate, profile.report_rates);
    localReportRate = snapped;
    try {
      await setProfileReportRate(profile.path, snapped);
      onUpdated();
    } catch (e) {
      console.error('Report rate write failed:', e);
      addToast('Report rate write failed');
      localReportRate = profile.report_rate;
    }
  }

  async function handleSetActive(res: ResolutionDto) {
    try {
      await setResolutionActive(res.path);
      onUpdated();
    } catch (e) { console.error('SetActive failed:', e); addToast('Failed to set active DPI stage'); }
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Polling rate -->
  <div class="editor-card">
    <div class="editor-card-header">
      <h3 class="text-sm font-medium flex items-center gap-2">
        <svg class="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Polling Rate
      </h3>
      <span class="text-xs font-mono text-primary">{localReportRate} Hz</span>
    </div>

    {#if profile.report_rates.length > 0}
      <div class="pill-group">
        {#each profile.report_rates as rate (rate)}
          <button
            onclick={() => handleReportRateChange(rate)}
            class="pill-btn {localReportRate === rate ? 'pill-btn-active' : ''}"
          >
            {rate}
          </button>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-base-content/35 italic">Not configurable</p>
    {/if}
  </div>

  <!-- DPI per resolution preset -->
  {#each profile.resolutions as res, i (res.index)}
    {@const dpi = localDpis[i] ?? res.dpi_x}
    <div class="editor-card {res.is_active ? 'ring-1 ring-primary/30' : ''}">
      <div class="editor-card-header">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-medium">Stage {res.index}</h3>
          {#if res.is_active}
            <span class="w-1.5 h-1.5 rounded-full bg-primary" title="Active"></span>
          {/if}
          {#if res.is_disabled}
            <span class="text-[10px] text-base-content/30">disabled</span>
          {/if}
        </div>
        <span class="text-xs font-mono text-secondary tabular-nums">
          {dpi}
          {#if res.dpi_y != null}&times;{res.dpi_y}{/if}
          <span class="text-base-content/30 ml-0.5">DPI</span>
        </span>
      </div>

      {#if res.dpi_list.length > 0}
        <div class="flex flex-col gap-1">
          <input
            type="range"
            class="range range-primary range-xs"
            min={Math.min(...res.dpi_list)}
            max={Math.max(...res.dpi_list)}
            step={res.dpi_list.length > 1 ? res.dpi_list[1] - res.dpi_list[0] : 50}
            value={dpi}
            oninput={(e) => debouncedDpiWrite(res, Number(e.currentTarget.value))}
          />
          <div class="flex justify-between">
            <span class="text-[10px] text-base-content/25">{Math.min(...res.dpi_list)}</span>
            <span class="text-[10px] text-base-content/25">{Math.max(...res.dpi_list)}</span>
          </div>
        </div>
      {:else}
        <p class="text-xs text-base-content/35 italic">No DPI list available</p>
      {/if}

      {#if !res.is_active && !res.is_disabled}
        <button onclick={() => handleSetActive(res)} class="pill-btn self-start text-[11px]">
          Set Active
        </button>
      {/if}
    </div>
  {/each}
</div>
