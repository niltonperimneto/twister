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

  /* Editable mirror of the profile state, keyed by resolution array position.
   * While a write is in flight we suppress the prop->local resync so an
   * in-progress drag isn't clobbered; otherwise local always tracks the
   * daemon's actual values (so a refresh, or a daemon-snapped value, shows
   * correctly). */
  let localReportRate: number = $state(0);
  let localDpis: number[] = $state([]);
  let pending: boolean = $state(false);

  $effect(() => {
    /* Track these as deps so the resync re-runs when the daemon data changes. */
    const rate = profile.report_rate;
    const dpis = profile.resolutions.map((r) => r.dpi_x);
    if (pending) return;
    localReportRate = rate;
    localDpis = dpis;
  });

  function snap(value: number, allowed: number[]): number {
    if (allowed.length === 0) return value;
    return allowed.reduce((best, v) =>
      Math.abs(v - value) < Math.abs(best - value) ? v : best,
    );
  }

  /* A valid range step for the allowed DPI list: the smallest gap between
   * sorted stops, never zero. Falls back to 50 for a single-value list. */
  function dpiStep(list: number[]): number {
    if (list.length < 2) return 50;
    const sorted = [...list].sort((a, b) => a - b);
    let min = Infinity;
    for (let j = 1; j < sorted.length; j++) {
      const gap = sorted[j] - sorted[j - 1];
      if (gap > 0 && gap < min) min = gap;
    }
    return Number.isFinite(min) ? min : 50;
  }

  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedDpiWrite(res: ResolutionDto, i: number, value: number) {
    const snapped = snap(value, res.dpi_list);
    pending = true;
    localDpis[i] = snapped;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        await setResolutionDpi(res.path, snapped, null);
        await onUpdated();
      } catch (e) {
        console.error('DPI write failed:', e);
        addToast(`DPI write failed: ${e}`);
        localDpis[i] = profile.resolutions[i]?.dpi_x ?? snapped;
      } finally {
        pending = false;
      }
    }, 150);
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
        <svg class="w-3.5 h-3.5 opacity-60 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Polling Rate
      </h3>
      <span class="text-xs font-mono text-primary font-bold">{localReportRate} Hz</span>
    </div>

    {#if profile.report_rates.length > 0}
      <div class="pill-group self-start">
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
      <p class="text-xs text-base-content/35 italic">Not configurable</p>
    {/if}
  </div>

  <!-- DPI per resolution preset -->
  {#each profile.resolutions as res, i (res.index)}
    {@const dpi = localDpis[i] ?? res.dpi_x}
    {@const isClickable = !res.is_active && !res.is_disabled}
    <!-- Card-wide click is a pointer convenience; the radio inside is the
         accessible (keyboard/screen-reader) control for the same action. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('input[type="range"]')) return;
        if (isClickable) handleSetActive(res);
      }}
      class="editor-card transition-all duration-200 {res.is_active ? 'ring-2 ring-primary/40 border-primary/20 bg-primary/5!' : ''} {isClickable ? 'cursor-pointer hover:border-base-content/15' : ''}"
    >
      <div class="editor-card-header">
        <div class="flex items-center gap-3">
          <input
            type="radio"
            name="active_dpi_stage"
            checked={res.is_active}
            disabled={res.is_disabled}
            aria-label="Use stage {res.index} as the active DPI"
            class="radio radio-primary radio-xs cursor-pointer disabled:opacity-30"
            onclick={(e) => {
              e.stopPropagation();
              if (!res.is_active) handleSetActive(res);
            }}
          />
          <h3 class="text-sm font-semibold tracking-wide">Stage {res.index}</h3>
          {#if res.is_disabled}
            <span class="badge badge-ghost badge-sm opacity-50 scale-90">disabled</span>
          {/if}
        </div>
        <span class="text-xs font-mono text-secondary font-bold tabular-nums">
          {dpi}
          {#if res.dpi_y != null}&times;{res.dpi_y}{/if}
          <span class="text-base-content/40 font-normal ml-0.5">DPI</span>
        </span>
      </div>

      {#if res.dpi_list.length > 0}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="flex flex-col gap-1.5" onclick={(e) => e.stopPropagation()}>
          <input
            type="range"
            class="slider"
            min={Math.min(...res.dpi_list)}
            max={Math.max(...res.dpi_list)}
            step={dpiStep(res.dpi_list)}
            value={dpi}
            aria-label="Stage {res.index} DPI"
            aria-valuetext="{dpi} DPI"
            oninput={(e) => debouncedDpiWrite(res, i, Number(e.currentTarget.value))}
          />
          <div class="flex justify-between px-0.5" aria-hidden="true">
            <span class="text-[9px] font-mono text-base-content/30">{Math.min(...res.dpi_list)}</span>
            <span class="text-[9px] font-mono text-base-content/30">{Math.max(...res.dpi_list)}</span>
          </div>
        </div>
      {:else}
        <p class="text-xs text-base-content/35 italic">No DPI list available</p>
      {/if}
    </div>
  {/each}
</div>
