<!-- App.svelte — root shell: DaisyUI dracula, CSD titlebar, horizontal split -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { deviceStore } from '$lib/stores/device.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { getToasts, addToast } from '$lib/stores/toast.svelte';
  import Titlebar from '$lib/components/Titlebar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import type { View } from '$lib/components/Sidebar.svelte';
  import DeviceVisualizer from '$lib/components/DeviceVisualizer.svelte';
  import DpiEditor from '$lib/components/DpiEditor.svelte';
  import ButtonMapper from '$lib/components/ButtonMapper.svelte';
  import LedEditor from '$lib/components/LedEditor.svelte';
  import StatusOverlay from '$lib/components/StatusOverlay.svelte';
  import WelcomePage from '$lib/components/WelcomePage.svelte';
  import AboutPage from '$lib/components/AboutPage.svelte';
  import DonatePage from '$lib/components/DonatePage.svelte';

  const store = deviceStore;
  const appWindow = getCurrentWindow();

  type Tab = 'dpi' | 'buttons' | 'leds';
  let activeTab: Tab = $state('dpi');
  let selectedSvgId: string | null = $state(null);
  let sidebarOpen: boolean = $state(false);
  let currentView: View = $state('welcome');
  let isMaximized: boolean = $state(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dpi', label: 'DPI' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'leds', label: 'Lighting' },
  ];

  /* When the first device is loaded, auto-switch from welcome → devices (once) */
  let hasAutoSwitched = false;
  $effect(() => {
    if (store.activeDevice && currentView === 'welcome' && !hasAutoSwitched) {
      hasAutoSwitched = true;
      currentView = 'devices';
    }
  });

  function handleSvgSelect(id: string) {
    selectedSvgId = id;
    if (id.startsWith('button')) activeTab = 'buttons';
    else if (id.startsWith('led')) activeTab = 'leds';
  }

  function handleNavigate(view: View) {
    currentView = view;
  }

  async function handleCommit() {
    try {
      await store.commit();
      addToast('Changes written to device', 'info');
    } catch (e) {
      addToast(`Commit failed: ${e}`, 'error');
    }
  }

  onMount(() => {
    themeStore.init();
    store.init();

    /* Track maximize state for corner radius */
    appWindow.isMaximized().then(v => { isMaximized = v; });
    const unlisten = appWindow.onResized(async () => {
      isMaximized = await appWindow.isMaximized();
    });
    return () => { unlisten.then(fn => fn()); };
  });

  /* ---- Global keyboard shortcuts ---- */
  function handleKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 's') {
      e.preventDefault();
      if (store.activeDevice) handleCommit();
    } else if (mod && e.key === 'q') {
      e.preventDefault();
      getCurrentWindow().close();
    } else if (mod && e.key === 'b') {
      e.preventDefault();
      sidebarOpen = !sidebarOpen;
    } else if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      const tabIds = tabs.map(t => t.id);
      const cur = tabIds.indexOf(activeTab);
      if (e.shiftKey) {
        activeTab = tabIds[(cur - 1 + tabIds.length) % tabIds.length];
      } else {
        activeTab = tabIds[(cur + 1) % tabIds.length];
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-theme="dracula" class="h-screen w-screen flex flex-col overflow-hidden bg-base-100 text-base-content" style="border-radius: {isMaximized ? '0' : 'var(--radius-lg)'}; transition: border-radius 150ms ease;">
  <Titlebar onToggleSidebar={() => (sidebarOpen = !sidebarOpen)} {isMaximized} />

  <div class="flex flex-1 min-h-0 p-2 gap-2">
    {#if sidebarOpen}
      <Sidebar
        devices={store.devices}
        activeDevice={store.activeDevice}
        activeProfileIndex={store.activeProfileIndex}
        {currentView}
        onSelectDevice={(path) => store.selectDevice(path)}
        onSelectProfile={(idx) => store.selectProfile(idx)}
        onNavigate={handleNavigate}
      />
    {/if}

    <main class="flex-1 flex min-w-0 min-h-0 overflow-hidden">
      {#if currentView === 'welcome'}
        <WelcomePage onNavigate={handleNavigate} />
      {:else if currentView === 'about'}
        <AboutPage />
      {:else if currentView === 'donate'}
        <DonatePage />
      {:else if currentView === 'devices'}
      {#if store.activeProfile}
        {@const isEmpty = store.activeProfile.buttons.length === 0
          && store.activeProfile.leds.length === 0
          && store.activeProfile.resolutions.length === 0}

        {#if isEmpty}
          <!-- Ghost device: probe failed or timed out, no capabilities -->
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center text-base-content/50 max-w-xs">
              <span class="loading loading-ring loading-lg opacity-40"></span>
              <p class="text-sm font-medium mt-3">Device not fully loaded</p>
              <p class="text-xs mt-1 opacity-60">
                The daemon could not read this device's configuration.
                Try restarting the daemon or reconnecting the mouse.
              </p>
            </div>
          </div>
        {:else}
        <!-- Left: Device SVG visualizer -->
        {#if store.activeDevice}
          {@const led0 = store.activeProfile?.leds?.[0]}
          {@const glow = led0 ? `rgb(${led0.color.r},${led0.color.g},${led0.color.b})` : null}
          <div class="w-2/5 shrink-0 flex flex-col items-center justify-center p-6 border-r border-base-300/40 bg-base-200/20 overflow-y-auto">
            <DeviceVisualizer
              model={store.activeDevice.model}
              selectedId={selectedSvgId}
              onSelect={handleSvgSelect}
              ambientColor={glow}
              class="max-w-sm w-full"
            />
            <p class="text-[10px] text-base-content/30 mt-3 select-none">Click a region to configure it</p>
          </div>
        {/if}

        <!-- Right: Tabs + editor panels -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Tab bar -->
          <div class="flex items-center justify-between px-4 pt-3 pb-2 shrink-0 border-b border-base-300/30">
            <div class="pill-group">
              {#each tabs as tab (tab.id)}
                <button
                  onclick={() => (activeTab = tab.id)}
                  class="pill-btn {activeTab === tab.id ? 'pill-btn-active' : ''} inline-flex items-center gap-1.5"
                >
                  {#if tab.id === 'dpi'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                  {:else if tab.id === 'buttons'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="6"/><line x1="12" y1="2" x2="12" y2="10"/></svg>
                  {:else if tab.id === 'leds'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  {/if}
                  {tab.label}
                </button>
              {/each}
            </div>

            <button
              onclick={handleCommit}
              class="btn btn-primary btn-sm gap-1"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              Apply
            </button>
          </div>

          <!-- Tab content with fade transition -->
          <div class="flex-1 overflow-y-auto p-4">
            {#key activeTab}
              <div in:fly={{ y: 12, duration: 250, delay: 60 }} out:fade={{ duration: 100 }}>
                {#if activeTab === 'dpi'}
                  <DpiEditor profile={store.activeProfile} onUpdated={() => store.refresh()} />
                {:else if activeTab === 'buttons'}
                  <ButtonMapper
                    profile={store.activeProfile}
                    deviceModel={store.activeDevice?.model ?? ''}
                    {selectedSvgId}
                    onSvgSelect={handleSvgSelect}
                    onUpdated={() => store.refresh()}
                  />
                {:else if activeTab === 'leds'}
                  <LedEditor profile={store.activeProfile} onUpdated={() => store.refresh()} />
                {/if}
              </div>
            {/key}
          </div>
        </div>
        {/if}
      {:else if store.isConnected && store.devices.length === 0 && !store.loading}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center text-base-content/50">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="6" y="2" width="12" height="20" rx="6" />
              <line x1="12" y1="2" x2="12" y2="10" />
            </svg>
            <p class="text-lg font-medium">No devices detected</p>
            <p class="text-sm mt-1 opacity-60">Connect a supported mouse and it will appear here</p>
          </div>
        </div>
      {:else if store.loading || !store.isConnected}
        <div class="flex-1 flex items-center justify-center">
          <span class="loading loading-dots loading-lg opacity-50"></span>
        </div>
      {:else}
        <!-- Closed-sidebar trap: no device selected, nudge to open sidebar -->
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center text-base-content/50 max-w-xs">
            <svg class="w-10 h-10 mx-auto mb-3 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            <p class="text-sm font-medium">Open the sidebar</p>
            <p class="text-xs mt-1 opacity-60">Use the ☰ menu or press <kbd class="kbd kbd-xs">Ctrl+B</kbd> to browse devices</p>
            <button onclick={() => (sidebarOpen = true)} class="btn btn-primary btn-sm mt-4 gap-1.5">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
              Open sidebar
            </button>
          </div>
        </div>
      {/if}
      {/if}
    </main>
  </div>

  <StatusOverlay
    status={store.daemonStatus}
    error={store.error}
    loading={store.loading}
    onRetry={() => store.init()}
  />

  <!-- Toast notifications -->
  {#if getToasts().length > 0}
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {#each getToasts() as toast (toast.id)}
        <div
          transition:fade={{ duration: 150 }}
          class="alert {toast.kind === 'error' ? 'alert-error' : 'alert-info'} text-xs py-2 px-3 shadow-lg"
        >
          <span>{toast.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
