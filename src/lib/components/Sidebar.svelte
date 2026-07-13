<!-- Sidebar — one element, two faces.

     Docked face: persistent navigation + device selector; collapses to an
     icon rail.

     Intro face (`intro` prop): the same <aside> stretched to fill the whole
     content row (App.svelte animates flex-grow), showing the branded
     mouse/keyboard chooser. Picking a kind docks the aside into the regular
     sidebar, so the intro page literally *becomes* the sidebar. -->
<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import type { DeviceSummary, DeviceDto, KeyboardSummary, View } from "$lib/types";
    import { deviceStore } from "$lib/stores/device.svelte";
    import { keyboardStore } from "$lib/stores/keyboard.svelte";
    import { DUR, duration, easeOut } from "$lib/motion";
    import Icon from "$lib/components/Icon.svelte";
    import auraLogo from "$lib/assets/aura-logo.svg";

    interface Props {
        devices: DeviceSummary[];
        activeDevice: DeviceDto | null;
        keyboards: KeyboardSummary[];
        activeKeyboardId: string | null;
        activeKind: "mouse" | "keyboard";
        currentView: View;
        collapsed: boolean;
        intro: boolean;
        onSelectDevice: (path: string) => void;
        onSelectKeyboard: (id: string) => void;
        onSelectKind: (kind: "mouse" | "keyboard") => void;
        onBackToChooser: () => void;
        onNavigate: (view: View) => void;
    }

    let {
        devices,
        activeDevice,
        keyboards,
        activeKeyboardId,
        activeKind,
        currentView,
        collapsed,
        intro,
        onSelectDevice,
        onSelectKeyboard,
        onSelectKind,
        onBackToChooser,
        onNavigate,
    }: Props = $props();

    /* Top-of-sidebar logo button: context-sensitive. From the editor it
       returns to the device-kind chooser; from Support/About it first goes
       back to the editor. The label always says what a click will do. */
    const homeAction: { label: string; act: () => void } = $derived(
        currentView === "devices"
            ? { label: "Switch device", act: onBackToChooser }
            : { label: "Back to devices", act: () => onNavigate("devices") },
    );

    const bottomNav: { id: View; label: string; icon: string }[] = [
        { id: "donate", label: "Support", icon: "heart" },
        { id: "about", label: "About", icon: "info" },
    ];

    /* Live status for the intro chooser cards. Read straight from the
       stores (KeyboardStatusNotice sets the precedent) so the cards stay
       honest about daemon state without more prop plumbing. */
    type KindStatus = { tone: "ok" | "warn" | "err" | "busy"; text: string };

    const mouseStatus: KindStatus = $derived.by(() => {
        if (deviceStore.loading) return { tone: "busy", text: "Detecting…" };
        if (!deviceStore.isConnected)
            return { tone: "err", text: "ratbagd not running" };
        if (devices.length === 0)
            return { tone: "warn", text: "No mice detected" };
        return {
            tone: "ok",
            text: devices.length === 1 ? "1 mouse connected" : `${devices.length} mice connected`,
        };
    });

    const keyboardStatus: KindStatus = $derived.by(() => {
        if (keyboardStore.loading) return { tone: "busy", text: "Detecting…" };
        if (!keyboardStore.isConnected)
            return { tone: "err", text: "clackd not running" };
        if (keyboards.length === 0)
            return { tone: "warn", text: "No keyboards detected" };
        return {
            tone: "ok",
            text:
                keyboards.length === 1
                    ? "1 keyboard connected"
                    : `${keyboards.length} keyboards connected`,
        };
    });

    const kinds: {
        kind: "mouse" | "keyboard";
        label: string;
        blurb: string;
        status: () => KindStatus;
    }[] = [
        {
            kind: "mouse",
            label: "Mouse",
            blurb: "DPI stages, button mapping and lighting via ratbagd",
            status: () => mouseStatus,
        },
        {
            kind: "keyboard",
            label: "Keyboard",
            blurb: "Keymap layers and lighting for VIA keyboards via clackd",
            status: () => keyboardStatus,
        },
    ];
</script>

<aside
    class="{intro ? 'w-56' : collapsed ? 'w-14' : 'w-56'} shrink-0 relative overflow-hidden"
    style="
        flex-grow: {intro ? 1 : 0};
        border-right: 1px solid {intro ? 'transparent' : 'oklch(1 0 0 / 0.06)'};
        transition:
            flex-grow var(--dur-slow) var(--ease-out),
            width var(--dur-fast) var(--ease-out),
            border-color var(--dur-slow) var(--ease-out);
    "
>
    {#if intro}
        <!-- ============ Intro face: full-window device-kind chooser ============ -->
        <div
            class="absolute inset-0 flex flex-col items-center justify-center overflow-hidden p-8 select-none"
            out:fade={{ duration: duration(DUR.fast) }}
        >
            <!-- Ambient floating orbs, inherited from the old splash -->
            <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div
                    class="absolute left-1/4 top-1/4 w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] animate-orb-drift origin-center"
                ></div>
                <div
                    class="absolute right-1/4 bottom-1/4 w-[380px] h-[380px] rounded-full bg-secondary/8 blur-[130px] animate-orb-float origin-center"
                ></div>
            </div>

            <!-- Branding -->
            <div
                class="relative z-10 flex flex-col items-center gap-3 mb-10"
                in:fly={{ y: 12, duration: duration(DUR.slow), easing: easeOut }}
            >
                <img
                    src={auraLogo}
                    alt=""
                    class="w-14 h-14 drop-shadow-[0_0_12px_rgba(114,137,218,0.2)] animate-logo-float"
                />
                <h1
                    class="text-2xl font-light tracking-[0.4em] bg-gradient-to-r from-base-content via-base-content/90 to-base-content/50 bg-clip-text text-transparent"
                    style="font-family: var(--font-display); text-shadow: 0 0 30px rgba(255,255,255,0.05);"
                >
                    TWISTER
                </h1>
                <p class="text-xs text-base-content/50 tracking-wide">
                    What would you like to configure?
                </p>
            </div>

            <!-- Kind chooser cards -->
            <div class="relative z-10 flex flex-wrap items-stretch justify-center gap-5 w-full max-w-2xl">
                {#each kinds as k, i (k.kind)}
                    {@const st = k.status()}
                    <button
                        type="button"
                        onclick={() => onSelectKind(k.kind)}
                        class="kind-card group flex-1 min-w-[220px] max-w-[300px] flex flex-col items-center gap-4 p-8 rounded-3xl border border-white/5 bg-white/[0.015] backdrop-blur-2xl text-center cursor-pointer"
                        in:fly={{
                            y: 16,
                            duration: duration(DUR.slow),
                            delay: duration(DUR.fast + i * 80),
                            easing: easeOut,
                        }}
                    >
                        <div
                            class="relative w-20 h-20 flex items-center justify-center"
                            aria-hidden="true"
                        >
                            <div
                                class="absolute inset-0 rounded-full bg-primary/5 blur-md group-hover:bg-primary/15 transition-colors"
                                style="transition-duration: var(--dur-base);"
                            ></div>
                            <div class="absolute inset-1 rounded-full border border-white/5"></div>
                            <Icon
                                name={k.kind}
                                class="w-9 h-9 relative opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all"
                            />
                        </div>

                        <div class="flex flex-col items-center gap-1.5">
                            <span
                                class="text-base font-semibold tracking-widest uppercase"
                                style="font-family: var(--font-display);">{k.label}</span
                            >
                            <span class="text-[11px] text-base-content/45 leading-relaxed max-w-[210px]">
                                {k.blurb}
                            </span>
                        </div>

                        <div class="flex items-center gap-1.5 mt-1">
                            <span
                                class="w-1.5 h-1.5 rounded-full shrink-0
                                    {st.tone === 'ok' ? 'bg-success' : ''}
                                    {st.tone === 'warn' ? 'bg-warning' : ''}
                                    {st.tone === 'err' ? 'bg-error' : ''}
                                    {st.tone === 'busy' ? 'bg-info animate-pulse' : ''}"
                                aria-hidden="true"
                            ></span>
                            <span class="text-[10px] font-mono tracking-wide text-base-content/50">
                                {st.text}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    {:else}
        <!-- ============ Docked face: the regular sidebar ============ -->
        <div
            class="absolute inset-0 flex flex-col gap-3 py-3 overflow-y-auto overflow-x-hidden"
            style="scrollbar-width: none;"
            in:fade={{ duration: duration(DUR.base), delay: duration(DUR.fast) }}
        >
            <!-- Logo button — context-sensitive: back to the chooser from the
                 editor, back to the editor from Support/About -->
            <section class="px-2">
                <button
                    onclick={homeAction.act}
                    class="sidebar-item sidebar-home {collapsed ? 'rail-item' : ''}"
                    title={collapsed ? homeAction.label : undefined}
                >
                    <img
                        src={auraLogo}
                        alt=""
                        class="w-5 h-5 shrink-0 drop-shadow-[0_0_6px_rgba(114,137,218,0.35)]"
                    />
                    {#if !collapsed}
                        <span class="text-sm font-semibold flex-1 min-w-0 truncate"
                            >{homeAction.label}</span
                        >
                        <Icon
                            name="chevron-left"
                            class="w-3.5 h-3.5 shrink-0 opacity-50"
                        />
                    {/if}
                </button>
            </section>

            <div class="mx-3 border-t border-base-300/30"></div>

            <!-- Connected devices, grouped by kind (selecting one also
                 navigates to the editor) -->
            {#if devices.length > 0}
                <section class="px-2">
                    {#if !collapsed}
                        <h2 class="sidebar-heading">
                            Mice
                            <span class="sidebar-heading-count">{devices.length}</span>
                        </h2>
                    {/if}
                    <ul class="flex flex-col gap-0.5">
                        {#each devices as device (device.path)}
                            {@const isActive =
                                currentView === "devices" &&
                                activeKind === "mouse" &&
                                activeDevice?.path === device.path}
                            <li>
                                <button
                                    onclick={() => onSelectDevice(device.path)}
                                    class="sidebar-item {collapsed ? 'rail-item' : ''} {isActive
                                        ? 'sidebar-item-active'
                                        : ''}"
                                    title={collapsed ? device.name : undefined}
                                >
                                    <span class="icon-chip {isActive ? 'icon-chip-active' : ''}">
                                        <Icon name="mouse" class="w-4 h-4" />
                                    </span>
                                    {#if !collapsed}
                                        <div class="flex flex-col min-w-0">
                                            <span class="text-sm font-medium truncate"
                                                >{device.name}</span
                                            >
                                            <span
                                                class="text-[10px] text-base-content/60 truncate"
                                                >{device.model}</span
                                            >
                                        </div>
                                    {/if}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}

            {#if keyboards.length > 0}
                <section class="px-2">
                    {#if !collapsed}
                        <h2 class="sidebar-heading">
                            Keyboards
                            <span class="sidebar-heading-count">{keyboards.length}</span>
                        </h2>
                    {/if}
                    <ul class="flex flex-col gap-0.5">
                        {#each keyboards as keeb (keeb.id)}
                            {@const isActive =
                                currentView === "devices" &&
                                activeKind === "keyboard" &&
                                activeKeyboardId === keeb.id}
                            <li>
                                <button
                                    onclick={() => onSelectKeyboard(keeb.id)}
                                    class="sidebar-item {collapsed ? 'rail-item' : ''} {isActive
                                        ? 'sidebar-item-active'
                                        : ''}"
                                    title={collapsed ? keeb.name : undefined}
                                >
                                    <span class="icon-chip {isActive ? 'icon-chip-active' : ''}">
                                        <Icon name="keyboard" class="w-4 h-4" />
                                    </span>
                                    {#if !collapsed}
                                        <div class="flex flex-col min-w-0">
                                            <span class="text-sm font-medium truncate"
                                                >{keeb.name}</span
                                            >
                                            <span
                                                class="text-[10px] text-base-content/60 truncate"
                                                >VIA keyboard</span
                                            >
                                        </div>
                                    {/if}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}

            {#if !collapsed && devices.length === 0 && keyboards.length === 0}
                <p class="text-xs text-base-content/30 px-4 py-2 italic">
                    No devices found
                </p>
            {/if}

            <!-- Bottom: daemon health + Support / About -->
            <section class="px-2 mt-auto flex flex-col gap-2">
                {#if !collapsed}
                    <div class="px-3 flex flex-col gap-1" aria-label="Daemon status">
                        <div class="flex items-center gap-1.5">
                            <span
                                class="w-1.5 h-1.5 rounded-full shrink-0 {deviceStore.isConnected
                                    ? 'bg-success'
                                    : 'bg-error'}"
                                aria-hidden="true"
                            ></span>
                            <span class="text-[10px] font-mono text-base-content/45"
                                >ratbagd · {deviceStore.isConnected ? "running" : "offline"}</span
                            >
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span
                                class="w-1.5 h-1.5 rounded-full shrink-0 {keyboardStore.isConnected
                                    ? 'bg-success'
                                    : 'bg-error'}"
                                aria-hidden="true"
                            ></span>
                            <span class="text-[10px] font-mono text-base-content/45"
                                >clackd · {keyboardStore.isConnected ? "running" : "offline"}</span
                            >
                        </div>
                    </div>
                {/if}
                <div class="mx-1 border-t border-base-300/30"></div>
                <ul class="flex flex-col gap-0.5">
                    {#each bottomNav as nav (nav.id)}
                        {@const isActive = currentView === nav.id}
                        <li>
                            <button
                                onclick={() => onNavigate(nav.id)}
                                class="sidebar-item {collapsed ? 'rail-item' : ''} {isActive
                                    ? 'sidebar-item-active'
                                    : ''}"
                                title={collapsed ? nav.label : undefined}
                            >
                                <Icon name={nav.icon} class="w-4 h-4 shrink-0" />
                                {#if !collapsed}
                                    <span class="text-sm font-medium">{nav.label}</span>
                                {/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            </section>
        </div>
    {/if}
</aside>

<style>
    /* Icon-rail mode: center the icon, drop the horizontal padding */
    .rail-item {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
    }

    /* Intro chooser cards — glassmorphic, lift on hover */
    .kind-card {
        box-shadow:
            0 30px 70px -20px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
        transition:
            transform var(--dur-base) var(--ease-out),
            border-color var(--dur-base) var(--ease-out),
            box-shadow var(--dur-base) var(--ease-out);
    }
    .kind-card:hover,
    .kind-card:focus-visible {
        transform: translateY(-3px);
        border-color: color-mix(in oklab, var(--color-primary) 35%, transparent);
        box-shadow:
            0 34px 80px -20px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
            0 0 40px -8px color-mix(in oklab, var(--color-primary) 15%, transparent);
    }
    .kind-card:active {
        transform: translateY(-1px) scale(0.99);
    }

    /* Ambient intro motion, inherited from the retired splash screen.
       Decorative only; neutralised by the global reduced-motion block. */
    @keyframes orb-drift {
        0%,
        100% {
            transform: translate(0, 0) scale(1);
        }
        50% {
            transform: translate(25px, -25px) scale(1.05);
        }
    }
    @keyframes orb-float {
        0%,
        100% {
            transform: translate(0, 0) scale(1);
        }
        50% {
            transform: translate(-25px, 25px) scale(1.03);
        }
    }
    @keyframes logo-float {
        0%,
        100% {
            transform: translateY(0) scale(1);
        }
        50% {
            transform: translateY(-4px) scale(1.02);
        }
    }
    .animate-orb-drift {
        animation: orb-drift 15s ease-in-out infinite;
    }
    .animate-orb-float {
        animation: orb-float 18s ease-in-out infinite;
    }
    .animate-logo-float {
        animation: logo-float 4s ease-in-out infinite;
    }
</style>
