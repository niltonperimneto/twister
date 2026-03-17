<!-- Sidebar — app navigation + device selector + profile tabs (DaisyUI + slide transition) -->
<script lang="ts">
    import type { DeviceSummary, DeviceDto, View } from "$lib/types";
    import { slide } from "svelte/transition";
    import Icon from "$lib/components/Icon.svelte";

    interface Props {
        devices: DeviceSummary[];
        activeDevice: DeviceDto | null;
        activeProfileIndex: number;
        currentView: View;
        onSelectDevice: (path: string) => void;
        onSelectProfile: (index: number) => void;
        onNavigate: (view: View) => void;
    }

    let {
        devices,
        activeDevice,
        activeProfileIndex,
        currentView,
        onSelectDevice,
        onSelectProfile,
        onNavigate,
    }: Props = $props();

    const navItems: { id: View; label: string; icon: string }[] = [
        { id: "welcome", label: "Welcome", icon: "home" },
        { id: "devices", label: "Devices", icon: "mouse" },
        { id: "donate", label: "Support", icon: "heart" },
        { id: "about", label: "About", icon: "info" },
    ];
</script>

<aside
    transition:slide={{ axis: "x", duration: 200 }}
    class="w-56 shrink-0 flex flex-col gap-3 py-3 overflow-y-auto"
    style="border-right: 1px solid oklch(1 0 0 / 0.06); scrollbar-width: none;"
>
    <!-- Navigation -->
    <section class="px-2">
        <ul class="flex flex-col gap-0.5">
            {#each navItems as nav (nav.id)}
                {@const isActive = currentView === nav.id}
                <li>
                    <button
                        onclick={() => onNavigate(nav.id)}
                        class="sidebar-item {isActive
                            ? 'sidebar-item-active'
                            : ''}"
                    >
                        <Icon name={nav.icon} class="w-4 h-4 shrink-0 " />
                        <span class="text-sm font-medium">{nav.label}</span>
                    </button>
                </li>
            {/each}
        </ul>
    </section>

    <!-- Device list (only when on devices view) -->
    {#if currentView === "devices"}
        <div class="mx-3 border-t border-base-300/30"></div>
        <section class="px-2">
            <h2 class="sidebar-heading">Connected</h2>
            <ul class="flex flex-col gap-0.5">
                {#each devices as device (device.path)}
                    {@const isActive = activeDevice?.path === device.path}
                    <li>
                        <button
                            onclick={() => onSelectDevice(device.path)}
                            class="sidebar-item {isActive
                                ? 'sidebar-item-active'
                                : ''}"
                        >
                            <Icon name="mouse" class="w-4 h-4 shrink-0 " />
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-medium truncate"
                                    >{device.name}</span
                                >
                                <span
                                    class="text-[10px] text-base-content/65 truncate"
                                    >{device.model}</span
                                >
                            </div>
                        </button>
                    </li>
                {/each}
            </ul>
            {#if devices.length === 0}
                <p class="text-xs text-base-content/25 px-3 py-2 italic">
                    No devices found
                </p>
            {/if}
        </section>

        <!-- Profile tabs -->
        {#if activeDevice}
            <div class="mx-3 border-t border-base-300/30"></div>
            <section class="px-2">
                <h2 class="sidebar-heading">Profiles</h2>
                <ul class="flex flex-col gap-0.5">
                    {#each activeDevice.profiles as profile (profile.index)}
                        {@const isActive = activeProfileIndex === profile.index}
                        <li>
                            <button
                                onclick={() => onSelectProfile(profile.index)}
                                class="sidebar-item {isActive
                                    ? 'sidebar-item-active'
                                    : ''}
                       {profile.disabled
                                    ? 'opacity-25 pointer-events-none'
                                    : ''}"
                            >
                                <span class="text-sm truncate flex-1">
                                    {profile.name || `Profile ${profile.index}`}
                                </span>
                                <span class="flex items-center gap-1 shrink-0">
                                    {#if profile.is_dirty}
                                        <span
                                            class="w-1.5 h-1.5 rounded-full bg-warning"
                                            title="Unsaved changes"
                                        ></span>
                                    {/if}
                                    {#if profile.is_active}
                                        <span
                                            class="w-1.5 h-1.5 rounded-full bg-primary"
                                            title="Active profile"
                                        ></span>
                                    {/if}
                                </span>
                            </button>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}
    {/if}
</aside>
