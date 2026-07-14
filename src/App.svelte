<!-- App.svelte — root shell: DaisyUI dracula, CSD titlebar, horizontal split -->
<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { deviceStore } from "$lib/stores/device.svelte";
    import { keyboardStore } from "$lib/stores/keyboard.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { updaterStore } from "$lib/stores/updater.svelte";
    import { getToasts, addToast } from "$lib/stores/toast.svelte";
    import { DUR, duration, easeOut } from "$lib/motion";
    import type { View } from "$lib/types";
    import Titlebar from "$lib/components/Titlebar.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import type { IconName } from "$lib/icons";
    import MouseVisualizer from "$lib/components/MouseVisualizer.svelte";
    import DpiEditor from "$lib/components/DpiEditor.svelte";
    import PollingRateSelector from "$lib/components/PollingRateSelector.svelte";
    import ButtonMapper from "$lib/components/ButtonMapper.svelte";
    import LedEditor from "$lib/components/LedEditor.svelte";
    import StatusOverlay from "$lib/components/StatusOverlay.svelte";
    import AboutPage from "$lib/components/AboutPage.svelte";
    import DonatePage from "$lib/components/DonatePage.svelte";
    import KeyboardEditor from "$lib/components/KeyboardEditor.svelte";
    import KeyboardStatusNotice from "$lib/components/KeyboardStatusNotice.svelte";
    import { profileHasLeds } from "$lib/mouse/leds";

    const store = deviceStore;
    const kb = keyboardStore;
    const appWindow = getCurrentWindow();

    /* Intro mode: on launch the sidebar fills the whole content row and shows
       the mouse/keyboard chooser; picking a kind docks it into the regular
       sidebar (the flex-grow transition below is the morph animation). */
    let introMode: boolean = $state(true);

    /* Which device class the editor area shows. Explicit sidebar selection
       wins (manualKind); otherwise default to whichever class actually has an
       active device, preferring mice for back-compat. */
    let manualKind: "mouse" | "keyboard" | null = $state(null);
    let activeDeviceKind: "mouse" | "keyboard" = $derived(
        manualKind ??
            (store.activeDevice
                ? "mouse"
                : kb.activeKeyboard
                  ? "keyboard"
                  : "mouse"),
    );

    /* The full-screen StatusOverlay is reserved for ratbagd, but must not block
       a keyboard-only setup (no ratbagd installed). Show it only when neither
       daemon offers a usable UI — and never over the intro chooser, whose
       cards already surface per-daemon status. */
    let showStatusOverlay = $derived(
        !introMode &&
            store.daemonStatus.status !== "connected" &&
            !kb.isConnected,
    );

    type Tab = "dpi" | "buttons" | "leds";
    let activeTab: Tab = $state("dpi");
    let selectedSvgId: string | null = $state(null);
    let sidebarCollapsed: boolean = $state(
        localStorage.getItem("twister_sidebar_collapsed") === "true",
    );
    let currentView: View = $state("devices");
    let isMaximized: boolean = $state(false);
    let committing: boolean = $state(false);

    function toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed;
        localStorage.setItem(
            "twister_sidebar_collapsed",
            String(sidebarCollapsed),
        );
    }

    /* Global ambient glow color derived from the first LED, with a
       fallback so every device gets a consistent glow even without LEDs
       or when the LED color is too dark to produce a visible glow */
    const DEFAULT_GLOW = "var(--color-primary)";
    let ambientGlow: string | null = $derived.by(() => {
        if (!store.activeDevice) return null;
        const led0 = store.activeProfile?.leds?.[0];
        if (!led0 || !hasLeds) return DEFAULT_GLOW;
        const { r, g, b } = led0.color;
        if (r + g + b < 30) return DEFAULT_GLOW;
        return `rgb(${r},${g},${b})`;
    });

    const allTabs: { id: Tab; label: string; icon: IconName }[] = [
        { id: "dpi", label: "DPI", icon: "gauge" },
        { id: "buttons", label: "Buttons", icon: "mouse" },
        { id: "leds", label: "Lighting", icon: "sun" },
    ];

    let hasLeds = $derived(
        store.activeProfile ? profileHasLeds(store.activeProfile) : false,
    );
    let tabs = $derived(hasLeds ? allTabs : allTabs.filter((t) => t.id !== "leds"));

    /* Fall back to "dpi" if the active tab is no longer available (e.g. switched
       to a device without LEDs while the Lighting tab was selected) */
    $effect(() => {
        if (!tabs.some((t) => t.id === activeTab)) {
            activeTab = "dpi";
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

    /* Intro chooser hand-off: pick the device class and dock the sidebar. */
    function handleSelectKind(kind: "mouse" | "keyboard") {
        manualKind = kind;
        currentView = "devices";
        introMode = false;
    }

    /* Reverse morph: the sidebar's logo button expands back to the chooser. */
    function handleBackToChooser() {
        introMode = true;
    }

    /* Unified Apply — routes to whichever device class is being edited */
    async function handleApply() {
        if (committing) return;
        const isKeyboard = activeDeviceKind === "keyboard";
        if (isKeyboard ? !kb.activeKeyboard : !store.activeDevice) return;
        committing = true;
        try {
            if (isKeyboard) {
                await kb.commit();
                addToast("Configuration written to keyboard NVRAM", "info");
            } else {
                await store.commit();
                addToast("Changes written to device", "info");
            }
        } catch (e) {
            const msg = String(e);
            if (msg.includes("timed out")) {
                addToast(
                    isKeyboard
                        ? "Commit timed out — changes are applied live"
                        : "Commit timed out — changes are applied live but may not persist after unplug",
                    "info",
                );
            } else {
                addToast(`Commit failed: ${e}`, "error");
            }
        } finally {
            committing = false;
        }
    }

    onMount(() => {
        themeStore.init();
        store.init();
        kb.init();
        updaterStore.init();

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
            handleApply();
        } else if (mod && e.key === "q") {
            e.preventDefault();
            getCurrentWindow().close();
        } else if (mod && e.key === "b") {
            e.preventDefault();
            toggleSidebar();
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
    <Titlebar onToggleSidebar={toggleSidebar} {isMaximized} />

    <div class="flex flex-1 min-h-0 p-2 gap-2">
        <Sidebar
            devices={store.devices}
            activeDevice={store.activeDevice}
            keyboards={kb.keyboards}
            activeKeyboardId={kb.activeKeyboardId}
            activeKind={activeDeviceKind}
            {currentView}
            collapsed={sidebarCollapsed}
            intro={introMode}
            onSelectDevice={(path) => {
                manualKind = "mouse";
                currentView = "devices";
                store.selectDevice(path);
            }}
            onSelectKeyboard={(id) => {
                manualKind = "keyboard";
                currentView = "devices";
                kb.selectKeyboard(id);
            }}
            onSelectKind={handleSelectKind}
            onBackToChooser={handleBackToChooser}
            onNavigate={handleNavigate}
        />

        <!-- flex-grow 0↔1 mirrors the sidebar's morph: collapsed to nothing
             while the intro chooser fills the row, expanding as it docks -->
        <main
            class="min-w-0 min-h-0 overflow-hidden relative"
            style="
                flex-basis: 0%;
                flex-grow: {introMode ? 0 : 1};
                opacity: {introMode ? 0 : 1};
                transition:
                    flex-grow var(--dur-slow) var(--ease-out),
                    opacity var(--dur-slow) var(--ease-out);
            "
            inert={introMode}
        >
            {#key currentView}
                <div
                    class="absolute inset-0 flex flex-col"
                    in:fly={{
                        y: 8,
                        duration: duration(DUR.base),
                        delay: duration(80),
                        easing: easeOut,
                    }}
                    out:fade={{ duration: duration(DUR.fast) }}
                >
                    {#if currentView === "about"}
                        <AboutPage />
                    {:else if currentView === "donate"}
                        <DonatePage />
                    {:else if currentView === "devices"}
                        {@const headerName =
                            activeDeviceKind === "keyboard"
                                ? (kb.keyboards.find(
                                      (k) => k.id === kb.activeKeyboardId,
                                  )?.name ??
                                  (kb.activeKeyboard ? "Keyboard" : null))
                                : (store.activeDevice?.name ?? null)}
                        {#if headerName}
                            <!-- Context header — device identity, profiles, Apply -->
                            <header
                                class="flex items-center gap-3 px-4 pt-3 pb-2.5 shrink-0"
                                style="border-bottom: 1px solid color-mix(in oklab, var(--color-base-content) 5%, transparent);"
                            >
                                <Icon
                                    name={activeDeviceKind}
                                    class="w-4 h-4 shrink-0 opacity-60"
                                />
                                <span class="text-sm font-semibold truncate"
                                    >{headerName}</span
                                >

                                {#if activeDeviceKind === "mouse" && store.activeDevice && store.activeDevice.profiles.length > 1}
                                    <div class="pill-group ml-2">
                                        {#each store.activeDevice.profiles as profile (profile.index)}
                                            <button
                                                onclick={() =>
                                                    store.selectProfile(
                                                        profile.index,
                                                    )}
                                                class="pill-btn {store.activeProfileIndex ===
                                                profile.index
                                                    ? 'pill-btn-active'
                                                    : ''} inline-flex items-center gap-1.5
                                                {profile.disabled
                                                    ? 'opacity-25 pointer-events-none'
                                                    : ''}"
                                            >
                                                {profile.name ||
                                                    `Profile ${profile.index}`}
                                                {#if profile.is_dirty}
                                                    <span
                                                        class="w-1.5 h-1.5 rounded-full bg-warning"
                                                        title="Unsaved changes"
                                                    ></span>
                                                {/if}
                                            </button>
                                        {/each}
                                    </div>
                                {/if}

                                <button
                                    onclick={handleApply}
                                    class="btn btn-primary btn-sm gap-1 ml-auto"
                                    disabled={committing}
                                >
                                    {#if committing}
                                        <span
                                            class="loading loading-spinner loading-xs"
                                        ></span>
                                        Applying…
                                    {:else}
                                        <Icon
                                            name="check"
                                            class="w-3.5 h-3.5"
                                        />
                                        Apply
                                    {/if}
                                </button>
                            </header>
                        {/if}
                        <div class="flex-1 flex overflow-hidden">
                            {#if activeDeviceKind === "keyboard"}
                                {#if kb.activeKeyboard}
                                    <div class="flex-1 flex overflow-hidden">
                                        <KeyboardEditor />
                                    </div>
                                {:else}
                                    <KeyboardStatusNotice />
                                {/if}
                            {:else if store.activeProfile}
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
                                    <!-- Left: parametric visualizer takes the free space -->
                                    {#if store.activeDevice}
                                        <div
                                            class="flex-1 min-w-0 flex flex-col items-center justify-center p-6 overflow-y-auto"
                                        >
                                            <MouseVisualizer
                                                profile={store.activeProfile}
                                                selectedId={selectedSvgId}
                                                onSelect={handleSvgSelect}
                                                ambientColor={ambientGlow}
                                                class="max-w-md w-full"
                                            />
                                            <p
                                                class="text-[10px] text-base-content/30 mt-3 select-none"
                                            >
                                                Click a region to configure it
                                            </p>
                                        </div>
                                    {/if}

                                    <!-- Right: Tabs + editor panels, capped on wide windows -->
                                    <div
                                        class="w-[52%] min-w-[380px] max-w-[880px] shrink-0 flex flex-col overflow-hidden"
                                    >
                                        <!-- Tab bar -->
                                        <div
                                            class="flex items-center px-4 pt-3 pb-2 shrink-0"
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
                                        </div>

                                        <!-- Polling rate — its own category, visible on every tab -->
                                        <div class="px-4 pb-1 shrink-0">
                                            <PollingRateSelector
                                                profile={store.activeProfile}
                                                onUpdated={() =>
                                                    store.refresh()}
                                            />
                                        </div>

                                        <!-- Tab content with fade transition -->
                                        <div class="flex-1 overflow-y-auto p-4">
                                            {#key activeTab}
                                                <div
                                                    in:fly={{
                                                        y: 12,
                                                        duration: duration(
                                                            DUR.base,
                                                        ),
                                                        delay: duration(60),
                                                        easing: easeOut,
                                                    }}
                                                    out:fade={{
                                                        duration: duration(
                                                            DUR.fast,
                                                        ),
                                                    }}
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
                                <!-- No device selected — sidebar is always visible now -->
                                <div
                                    class="flex-1 flex items-center justify-center"
                                >
                                    <div
                                        class="text-center text-base-content/50 max-w-xs"
                                    >
                                        <Icon
                                            name="mouse"
                                            class="w-10 h-10 mx-auto mb-3 opacity-25"
                                        />
                                        <p class="text-sm font-medium">
                                            Select a device
                                        </p>
                                        <p class="text-xs mt-1 opacity-60">
                                            Pick a device from the sidebar to
                                            start configuring it
                                        </p>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/key}
        </main>
    </div>

    {#if showStatusOverlay}
        <StatusOverlay
            status={store.daemonStatus}
            error={store.error}
            loading={store.loading}
            onRetry={() => store.init()}
        />
    {/if}

    <!-- Ambient glow overlay — rendered last so it bleeds over all UI elements -->
    {#if ambientGlow}
        <div
            class="ambient-glow pointer-events-none absolute inset-2 z-40 rounded-lg"
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
                    transition:fade={{ duration: duration(DUR.fast) }}
                    class="toast-alert alert {toast.kind === 'error'
                        ? 'alert-error'
                        : 'alert-info'} text-xs py-2 px-3 shadow-lg"
                >
                    <span>{toast.message}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>
