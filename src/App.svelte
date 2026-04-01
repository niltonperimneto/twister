<!-- App.svelte — root shell: DaisyUI dracula, CSD titlebar, horizontal split -->
<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { deviceStore } from "$lib/stores/device.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { getToasts, addToast } from "$lib/stores/toast.svelte";
    import type { View } from "$lib/types";
    import Titlebar from "$lib/components/Titlebar.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import DeviceVisualizer from "$lib/components/DeviceVisualizer.svelte";
    import DpiEditor from "$lib/components/DpiEditor.svelte";
    import ButtonMapper from "$lib/components/ButtonMapper.svelte";
    import LedEditor from "$lib/components/LedEditor.svelte";
    import StatusOverlay from "$lib/components/StatusOverlay.svelte";
    import WelcomePage from "$lib/components/WelcomePage.svelte";
    import AboutPage from "$lib/components/AboutPage.svelte";
    import DonatePage from "$lib/components/DonatePage.svelte";

    const store = deviceStore;
    const appWindow = getCurrentWindow();

    type Tab = "dpi" | "buttons" | "leds";
    let activeTab: Tab = $state("dpi");
    let selectedSvgId: string | null = $state(null);
    let sidebarOpen: boolean = $state(false);
    let currentView: View = $state("welcome");
    let isMaximized: boolean = $state(false);

    /* Global ambient glow color derived from the first LED, with a
       fallback so every device gets a consistent glow even without LEDs
       or when the LED color is too dark to produce a visible glow */
    const DEFAULT_GLOW = "rgb(120,160,255)";
    let ambientGlow: string | null = $derived.by(() => {
        if (!store.activeDevice) return null;
        const led0 = store.activeProfile?.leds?.[0];
        if (!led0) return DEFAULT_GLOW;
        const { r, g, b } = led0.color;
        if (r + g + b < 30) return DEFAULT_GLOW;
        return `rgb(${r},${g},${b})`;
    });

    const allTabs: { id: Tab; label: string; icon: string }[] = [
        { id: "dpi", label: "DPI", icon: "chevrons-right" },
        { id: "buttons", label: "Buttons", icon: "mouse" },
        { id: "leds", label: "Lighting", icon: "sun" },
    ];

    let hasLeds = $derived(
        store.activeProfile?.leds?.some((l) =>
            l.modes.some((m) => m !== 0) || (l.modes.length === 0 && l.mode !== 0),
        ) ?? false,
    );
    let tabs = $derived(hasLeds ? allTabs : allTabs.filter((t) => t.id !== "leds"));

    /* Fall back to "dpi" if the active tab is no longer available (e.g. switched
       to a device without LEDs while the Lighting tab was selected) */
    $effect(() => {
        if (!tabs.some((t) => t.id === activeTab)) {
            activeTab = "dpi";
        }
    });

    /* When the first device is loaded, auto-switch from welcome → devices (once) */
    let hasAutoSwitched = false;
    $effect(() => {
        if (
            store.activeDevice &&
            currentView === "welcome" &&
            !hasAutoSwitched
        ) {
            hasAutoSwitched = true;
            currentView = "devices";
        }
    });

    function handleSvgSelect(id: string) {
        selectedSvgId = id;
        if (id.startsWith("button")) activeTab = "buttons";
        else if (id.startsWith("led") && hasLeds) activeTab = "leds";
    }

    function handleNavigate(view: View) {
        currentView = view;
    }

    async function handleCommit() {
        try {
            await store.commit();
            addToast("Changes written to device", "info");
        } catch (e) {
            addToast(`Commit failed: ${e}`, "error");
        }
    }

    onMount(() => {
        themeStore.init();
        store.init();

        /* Track maximize state for corner radius */
        appWindow.isMaximized().then((v) => {
            isMaximized = v;
        });
        const unlisten = appWindow.onResized(async () => {
            isMaximized = await appWindow.isMaximized();
        });
        return () => {
            unlisten.then((fn) => fn());
        };
    });

    /* ---- Global keyboard shortcuts ---- */
    function handleKeydown(e: KeyboardEvent) {
        const mod = e.ctrlKey || e.metaKey;

        if (mod && e.key === "s") {
            e.preventDefault();
            if (store.activeDevice) handleCommit();
        } else if (mod && e.key === "q") {
            e.preventDefault();
            getCurrentWindow().close();
        } else if (mod && e.key === "b") {
            e.preventDefault();
            sidebarOpen = !sidebarOpen;
        } else if (e.ctrlKey && e.key === "Tab") {
            e.preventDefault();
            const tabIds = tabs.map((t) => t.id);
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

<div
    class="app-root h-screen w-screen flex flex-col text-base-content relative"
    style="border-radius: {isMaximized ? '0' : 'var(--radius-lg)'};"
>
    <Titlebar
        onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
        {isMaximized}
    />

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

        <main class="flex-1 min-w-0 min-h-0 overflow-hidden relative">
            {#key currentView}
                <div class="absolute inset-0 flex flex-col">
                    {#if currentView === "welcome"}
                        <WelcomePage onNavigate={handleNavigate} />
                    {:else if currentView === "about"}
                        <AboutPage />
                    {:else if currentView === "donate"}
                        <DonatePage />
                    {:else if currentView === "devices"}
                        <div
                            class="flex-1 flex overflow-hidden"
                            in:fade={{ duration: 250 }}
                        >
                            {#if store.activeProfile}
                                {@const isEmpty =
                                    store.activeProfile.buttons.length === 0 &&
                                    store.activeProfile.leds.length === 0 &&
                                    store.activeProfile.resolutions.length ===
                                        0}

                                {#if isEmpty}
                                    <!-- Ghost device: probe failed or timed out, no capabilities -->
                                    <div
                                        class="flex-1 flex items-center justify-center"
                                    >
                                        <div
                                            class="text-center text-base-content/50 max-w-xs"
                                        >
                                            <span
                                                class="loading loading-ring loading-lg opacity-40"
                                            ></span>
                                            <p class="text-sm font-medium mt-3">
                                                Device not fully loaded
                                            </p>
                                            <p class="text-xs mt-1 opacity-60">
                                                The daemon could not read this
                                                device's configuration. Try
                                                restarting the daemon or
                                                reconnecting the mouse.
                                            </p>
                                        </div>
                                    </div>
                                {:else}
                                    <!-- Left: Device SVG visualizer -->
                                    {#if store.activeDevice}
                                        <div
                                            class="w-2/5 shrink-0 flex flex-col items-center justify-center p-6 overflow-y-auto"
                                        >
                                            <DeviceVisualizer
                                                model={store.activeDevice.model}
                                                selectedId={selectedSvgId}
                                                onSelect={handleSvgSelect}
                                                ambientColor={ambientGlow}
                                                class="max-w-sm w-full"
                                            />
                                            <p
                                                class="text-[10px] text-base-content/30 mt-3 select-none"
                                            >
                                                Click a region to configure it
                                            </p>
                                        </div>
                                    {/if}

                                    <!-- Right: Tabs + editor panels -->
                                    <div
                                        class="flex-1 flex flex-col min-w-0 overflow-hidden"
                                    >
                                        <!-- Tab bar -->
                                        <div
                                            class="flex items-center justify-between px-4 pt-3 pb-2 shrink-0"
                                        >
                                            <div class="pill-group">
                                                {#each tabs as tab (tab.id)}
                                                    <button
                                                        onclick={() =>
                                                            (activeTab =
                                                                tab.id)}
                                                        class="pill-btn {activeTab ===
                                                        tab.id
                                                            ? 'pill-btn-active'
                                                            : ''} inline-flex items-center gap-1.5"
                                                    >
                                                        <Icon
                                                            name={tab.icon}
                                                            class="w-3.5 h-3.5"
                                                        />
                                                        {tab.label}
                                                    </button>
                                                {/each}
                                            </div>

                                            <button
                                                onclick={handleCommit}
                                                class="btn btn-primary btn-sm gap-1"
                                            >
                                                <Icon
                                                    name="check"
                                                    class="w-3.5 h-3.5"
                                                />
                                                Apply
                                            </button>
                                        </div>

                                        <!-- Tab content with fade transition -->
                                        <div class="flex-1 overflow-y-auto p-4">
                                            {#key activeTab}
                                                <div
                                                    in:fly={{
                                                        y: 12,
                                                        duration: 250,
                                                        delay: 60,
                                                    }}
                                                    out:fade={{ duration: 100 }}
                                                >
                                                    {#if activeTab === "dpi"}
                                                        <DpiEditor
                                                            profile={store.activeProfile}
                                                            onUpdated={() =>
                                                                store.refresh()}
                                                        />
                                                    {:else if activeTab === "buttons"}
                                                        <ButtonMapper
                                                            profile={store.activeProfile}
                                                            deviceModel={store
                                                                .activeDevice
                                                                ?.model ?? ""}
                                                            {selectedSvgId}
                                                            onSvgSelect={handleSvgSelect}
                                                            onUpdated={() =>
                                                                store.refresh()}
                                                        />
                                                    {:else if activeTab === "leds"}
                                                        <LedEditor
                                                            profile={store.activeProfile}
                                                            onUpdated={() =>
                                                                store.refresh()}
                                                        />
                                                    {/if}
                                                </div>
                                            {/key}
                                        </div>
                                    </div>
                                {/if}
                            {:else if store.isConnected && store.devices.length === 0 && !store.loading}
                                <div
                                    class="flex-1 flex items-center justify-center"
                                >
                                    <div
                                        class="text-center text-base-content/50"
                                    >
                                        <Icon
                                            name="mouse"
                                            class="w-12 h-12 mx-auto mb-3 opacity-30"
                                        />
                                        <p class="text-lg font-medium">
                                            No devices detected
                                        </p>
                                        <p class="text-sm mt-1 opacity-60">
                                            Connect a supported mouse and it
                                            will appear here
                                        </p>
                                    </div>
                                </div>
                            {:else if store.loading || !store.isConnected}
                                <div
                                    class="flex-1 flex items-center justify-center"
                                >
                                    <span
                                        class="loading loading-dots loading-lg opacity-50"
                                    ></span>
                                </div>
                            {:else}
                                <!-- Closed-sidebar trap: no device selected, nudge to open sidebar -->
                                <div
                                    class="flex-1 flex items-center justify-center"
                                >
                                    <div
                                        class="text-center text-base-content/50 max-w-xs"
                                    >
                                        <Icon
                                            name="panel-left"
                                            class="w-10 h-10 mx-auto mb-3 opacity-25"
                                        />
                                        <p class="text-sm font-medium">
                                            Open the sidebar
                                        </p>
                                        <p class="text-xs mt-1 opacity-60">
                                            Use the ☰ menu or press <kbd
                                                class="kbd kbd-xs">Ctrl+B</kbd
                                            > to browse devices
                                        </p>
                                        <button
                                            onclick={() => (sidebarOpen = true)}
                                            class="btn btn-primary btn-sm mt-4 gap-1.5"
                                        >
                                            <Icon
                                                name="panel-left"
                                                class="w-3.5 h-3.5"
                                            />
                                            Open sidebar
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/key}
        </main>
    </div>

    <StatusOverlay
        status={store.daemonStatus}
        error={store.error}
        loading={store.loading}
        onRetry={() => store.init()}
    />

    <!-- Ambient glow overlay — rendered last so it bleeds over all UI elements -->
    {#if ambientGlow}
        <div
            class="pointer-events-none absolute inset-2 z-40 rounded-lg"
            style="
                background: radial-gradient(ellipse 80% 70% at 50% 50%, {ambientGlow}, transparent 70%);
                opacity: 0.15;
                transition: background 1.5s ease;
            "
        ></div>
    {/if}

    <!-- Toast notifications — aria-live so screen readers announce new messages -->
    {#if getToasts().length > 0}
        <div
            class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs"
            aria-live="polite"
            aria-atomic="false"
            role="status"
        >
            {#each getToasts() as toast (toast.id)}
                <div
                    transition:fade={{ duration: 150 }}
                    class="alert {toast.kind === 'error'
                        ? 'alert-error'
                        : 'alert-info'} text-xs py-2 px-3 shadow-lg"
                >
                    <span>{toast.message}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>
