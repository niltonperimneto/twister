<!-- DeviceVisualizer — renders a Piper SVG with interactive button/LED overlays.
     Clicking a button/LED element emits the corresponding index. Hovering highlights it. -->
<script lang="ts">
  import { loadDeviceSvg } from '$lib/svg-lookup';
  import { tick } from 'svelte';

  interface Props {
    /** ratbagd model string, e.g. "usb:046d:4074:0" */
    model: string;
    /** Currently selected element ID, e.g. "button2" or "led0" */
    selectedId?: string | null;
    /** Fired when the user clicks an interactive SVG region */
    onSelect?: (id: string) => void;
    /** CSS color for the ambient glow behind the SVG (e.g. "rgb(0,255,128)") */
    ambientColor?: string | null;
    /** CSS classes for the wrapper */
    class?: string;
  }

  let { model, selectedId = null, onSelect, ambientColor = null, class: className = '' }: Props = $props();

  let svgHtml: string = $state('');
  let container: HTMLDivElement | undefined = $state();
  let hoveredId: string | null = $state(null);
  let mouseX: number = $state(0);
  let mouseY: number = $state(0);

  /* Load SVG when model changes — clean up old listeners on re-load */
  $effect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    loadDeviceSvg(model).then(async (html) => {
      if (signal.aborted) return;
      svgHtml = html;
      await tick();
      if (signal.aborted || !container) return;

      const interactives = container.querySelectorAll('[id^="button"], [id^="led"]');
      for (const el of interactives) {
        el.addEventListener('click', handleClick, { signal });
        el.addEventListener('mouseenter', handleEnter, { signal });
        el.addEventListener('mouseleave', handleLeave, { signal });
      }
    });

    return () => controller.abort();
  });

  /* Apply highlight classes based on selection/hover state */
  $effect(() => {
    if (!container) return;
    const interactives = container.querySelectorAll('[id^="button"], [id^="led"]');
    for (const el of interactives) {
      el.classList.remove('svg-highlight', 'svg-selected', 'svg-dimmed');
      const id = el.getAttribute('id') ?? '';

      if (id === selectedId) {
        el.classList.add('svg-selected');
      } else if (id === hoveredId) {
        el.classList.add('svg-highlight');
      } else if (selectedId) {
        el.classList.add('svg-dimmed');
      }
    }
  });

  function handleClick(e: Event) {
    const id = (e.currentTarget as Element).getAttribute('id');
    if (id && onSelect) onSelect(id);
  }

  function handleEnter(e: Event) {
    hoveredId = (e.currentTarget as Element).getAttribute('id');
  }

  function handleLeave() {
    hoveredId = null;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  /** Format a raw SVG ID like "button2" into "Button 2" */
  function formatLabel(id: string): string {
    const match = id.match(/^(button|led)(\d+)$/);
    if (!match) return id;
    const kind = match[1] === 'button' ? 'Button' : 'LED';
    return `${kind} ${match[2]}`;
  }
</script>

<div
  bind:this={container}
  class="device-svg relative flex items-center justify-center {className}"
  onmousemove={handleMouseMove}
  role="group"
>
  {#if svgHtml}
    {@html svgHtml}
  {:else}
    <span class="loading loading-ring loading-lg"></span>
  {/if}

  <!-- Floating tooltip -->
  {#if hoveredId}
    <div
      class="tooltip-float"
      style="left: {mouseX + 14}px; top: {mouseY - 8}px;"
    >
      {formatLabel(hoveredId)}
    </div>
  {/if}
</div>

<style>
  .device-svg :global(svg) {
    width: 100%;
    height: 100%;
    max-height: 420px;
    object-fit: contain;
    position: relative;
    z-index: 1;
  }

  .tooltip-float {
    position: absolute;
    z-index: 50;
    pointer-events: none;
    padding: 0.375rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 500;
    white-space: nowrap;
    border-radius: 10px;
    background: oklch(0.22 0.01 265 / 0.65);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid oklch(0.4 0 0 / 0.15);
    box-shadow:
      inset 0 0 0 1px oklch(1 0 0 / 0.04),
      0 4px 20px oklch(0 0 0 / 0.3);
    color: oklch(0.9 0 0 / 0.9);
  }
</style>

