<!-- DPI stages editor — one card, a stage alternator and a single slider -->
<script lang="ts">
  import type { ProfileDto, ResolutionDto } from '$lib/types';
  import { setResolutionDpi, setResolutionActive } from '$lib/ipc/commands';
  import { addToast } from '$lib/stores/toast.svelte';
  import Icon from './Icon.svelte';

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
  let localDpis: number[] = $state([]);
  let pending: boolean = $state(false);

  $effect(() => {
    /* Track these as deps so the resync re-runs when the daemon data changes. */
    const dpis = profile.resolutions.map((r) => r.dpi_x);
    if (pending) return;
    localDpis = dpis;
  });

  /* Which stage the slider edits — array position, not res.index. Starts on
   * the device's active stage when switching profiles, and is clamped when
   * the stage list shrinks. */
  let editIndex: number = $state(0);

  $effect(() => {
    const path = profile.path;
    void path;
    const active = profile.resolutions.findIndex((r) => r.is_active);
    editIndex = active >= 0 ? active : 0;
  });

  $effect(() => {
    if (editIndex >= profile.resolutions.length) editIndex = 0;
  });

  let edited: ResolutionDto | undefined = $derived(profile.resolutions[editIndex]);

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

  async function handleSetActive(res: ResolutionDto) {
    try {
      await setResolutionActive(res.path);
      onUpdated();
    } catch (e) { console.error('SetActive failed:', e); addToast('Failed to set active DPI stage'); }
  }
</script>

<div class="editor-card">
  <div class="editor-card-header">
    <h3 class="text-sm font-semibold tracking-wide flex items-center gap-2">
      <Icon name="gauge" class="w-3.5 h-3.5 opacity-60" />
      DPI Stages
    </h3>
    {#if edited}
      <span class="text-xs font-mono text-secondary font-bold tabular-nums">
        {localDpis[editIndex] ?? edited.dpi_x}
        {#if edited.dpi_y != null}&times;{edited.dpi_y}{/if}
        <span class="text-base-content/40 font-normal ml-0.5">DPI</span>
      </span>
    {/if}
  </div>

  <!-- Stage alternator: the pill body selects the stage under edit; the
       target-icon radio marks/sets the ACTIVE stage on the device. -->
  <div class="pill-group self-start" role="group" aria-label="DPI stages">
    {#each profile.resolutions as res, i (res.index)}
      <div
        class="stage-pill {editIndex === i ? 'stage-pill-editing' : ''} {res.is_disabled ? 'opacity-40' : ''}"
      >
        <input
          type="radio"
          name="active_dpi_stage"
          id="dpi-active-{res.index}"
          class="sr-only"
          checked={res.is_active}
          disabled={res.is_disabled}
          aria-label="Use stage {res.index} as the active DPI"
          onchange={() => { if (!res.is_active) handleSetActive(res); }}
        />
        <label
          for="dpi-active-{res.index}"
          class="stage-pill-radio"
          title={res.is_active ? 'Active stage' : 'Set as active stage'}
        >
          <Icon
            name="target"
            class="w-3.5 h-3.5 {res.is_active ? 'text-primary' : 'opacity-30'}"
          />
        </label>
        <button
          class="stage-pill-btn"
          onclick={() => (editIndex = i)}
          aria-pressed={editIndex === i}
        >
          {res.index}
        </button>
      </div>
    {/each}
  </div>

  {#if edited}
    {#if edited.is_disabled}
      <span class="badge badge-ghost badge-sm opacity-50 self-start">disabled</span>
    {/if}
    {#if edited.dpi_list.length > 0}
      <div class="flex flex-col gap-1.5">
        <input
          type="range"
          class="slider"
          min={Math.min(...edited.dpi_list)}
          max={Math.max(...edited.dpi_list)}
          step={dpiStep(edited.dpi_list)}
          value={localDpis[editIndex] ?? edited.dpi_x}
          aria-label="Stage {edited.index} DPI"
          aria-valuetext="{localDpis[editIndex] ?? edited.dpi_x} DPI"
          oninput={(e) => debouncedDpiWrite(edited!, editIndex, Number(e.currentTarget.value))}
        />
        <div class="flex justify-between px-0.5" aria-hidden="true">
          <span class="text-[9px] font-mono text-base-content/30">{Math.min(...edited.dpi_list)}</span>
          <span class="text-[9px] font-mono text-base-content/30">{Math.max(...edited.dpi_list)}</span>
        </div>
      </div>
    {:else}
      <p class="text-xs text-base-content/35 italic">No DPI list available</p>
    {/if}
  {/if}
</div>

<style>
  /* Split pill: mirrors .pill-btn (app.css) but hosts two controls —
     the active-stage radio (icon) and the edit-selection button. */
  .stage-pill {
    display: inline-flex;
    align-items: center;
    border: 1px solid oklch(0.4 0 0 / 0.3);
    border-radius: var(--radius-button);
    transition: all 150ms ease;
  }

  .stage-pill:hover {
    border-color: oklch(0.55 0 0 / 0.5);
    background: oklch(0.35 0 0 / 0.3);
  }

  .stage-pill-editing,
  .stage-pill-editing:hover {
    border-color: var(--color-primary);
    background: var(--selection-bg);
    color: var(--selection-fg);
  }

  :global([data-style="flat"]) .stage-pill-editing {
    border-color: transparent;
  }

  .stage-pill-radio {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0 0.25rem 0.55rem;
    cursor: pointer;
  }

  .stage-pill input:disabled + .stage-pill-radio {
    cursor: not-allowed;
  }

  /* Keep keyboard focus visible even though the radio itself is sr-only. */
  .stage-pill input:focus-visible + .stage-pill-radio {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
    border-radius: var(--radius-button);
  }

  .stage-pill-btn {
    padding: 0.25rem 0.625rem 0.25rem 0.35rem;
    background: transparent;
    border: none;
    color: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
</style>
