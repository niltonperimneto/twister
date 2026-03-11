<!-- CSD Titlebar — frameless window drag region (DaisyUI) -->
<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';

  const appWindow = getCurrentWindow();

  interface Props {
    onToggleSidebar: () => void;
    isMaximized?: boolean;
  }

  let { onToggleSidebar, isMaximized = false }: Props = $props();

  async function minimize() { await appWindow.minimize(); }
  async function toggleMaximize() { await appWindow.toggleMaximize(); }
  async function close() { await appWindow.close(); }
</script>

<header
  data-tauri-drag-region
  class="flex items-center justify-between min-h-10 h-10 px-4 select-none shrink-0 border-b border-base-content/5"
  style="border-radius: {isMaximized ? '0' : 'var(--radius-sm) var(--radius-sm) 0 0'}; background: var(--surface-titlebar); backdrop-filter: var(--backdrop-blur); -webkit-backdrop-filter: var(--backdrop-blur); transition: border-radius 150ms ease;"
>
  <!-- Left: hamburger -->
  <div class="flex items-center">
    <button onclick={onToggleSidebar} class="titlebar-btn hover:text-primary" aria-label="Toggle sidebar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="2" y1="4" x2="14" y2="4"/>
        <line x1="2" y1="8" x2="14" y2="8"/>
        <line x1="2" y1="12" x2="14" y2="12"/>
      </svg>
    </button>
  </div>

  <!-- Right: window controls -->
  <div class="flex items-center gap-1.5">
    <button onclick={minimize} class="titlebar-btn hover:text-primary" aria-label="Minimize">
      <svg width="10" height="10" viewBox="0 0 12 12"><rect y="5" width="12" height="2" rx="1" fill="currentColor"/></svg>
    </button>
    <button onclick={toggleMaximize} class="titlebar-btn hover:text-primary" aria-label="Maximize">
      <svg width="10" height="10" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
    </button>
    <button onclick={close} class="titlebar-btn titlebar-btn-close" aria-label="Close">
      <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
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
    color: oklch(0.6 0 0);
    cursor: pointer;
    transition: all 150ms ease;
  }
  .titlebar-btn:hover {
    background: oklch(0.5 0 0 / 0.15);
    color: oklch(0.85 0 0);
  }
  .titlebar-btn-close:hover {
    background: oklch(0.65 0.25 25 / 0.2);
    color: oklch(0.75 0.2 25);
  }
</style>

