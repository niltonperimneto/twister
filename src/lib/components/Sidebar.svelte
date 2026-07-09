<!-- Sidebar — persistent navigation + device selector; collapses to an icon rail -->
<script lang="ts">
    import type { DeviceSummary, DeviceDto, KeyboardSummary, View } from "$lib/types";
    import Icon from "$lib/components/Icon.svelte";

    interface Props {
        devices: DeviceSummary[];
        activeDevice: DeviceDto | null;
        keyboards: KeyboardSummary[];
        activeKeyboardId: string | null;
        activeKind: "mouse" | "keyboard";
        currentView: View;
        collapsed: boolean;
        onSelectDevice: (path: string) => void;
        onSelectKeyboard: (id: string) => void;
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
        onSelectDevice,
        onSelectKeyboard,
        onNavigate,
    }: Props = $props();

    const bottomNav: { id: View; label: string; icon: string }[] = [
        { id: "donate", label: "Support", icon: "heart" },
        { id: "about", label: "About", icon: "info" },
    ];
</script>

<aside
    class="{collapsed ? 'w-14' : 'w-56'} shrink-0 flex flex-col gap-3 py-3 overflow-y-auto overflow-x-hidden"
    style="border-right: 1px solid oklch(1 0 0 / 0.06); scrollbar-width: none; transition: width var(--dur-fast) var(--ease-out);"
>
    <!-- Devices nav — the way back to the editor from Support/About,
         even when nothing is connected -->
    <section class="px-2">
        <button
            onclick={() => onNavigate("devices")}
            class="sidebar-item {collapsed ? 'rail-item' : ''} {currentView ===
            'devices'
                ? 'sidebar-item-active'
                : ''}"
            title={collapsed ? "Devices" : undefined}
        >
            <Icon name="mouse" class="w-4 h-4 shrink-0 " />
            {#if !collapsed}
                <span class="text-sm font-medium">Devices</span>
            {/if}
        </button>
    </section>

    <div class="mx-3 border-t border-base-300/30"></div>

    <!-- Connected devices (selecting one also navigates to the editor) -->
    <section class="px-2">
        {#if !collapsed}
            <h2 class="sidebar-heading">Connected</h2>
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
                        <Icon name="mouse" class="w-4 h-4 shrink-0 " />
                        {#if !collapsed}
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-medium truncate"
                                    >{device.name}</span
                                >
                                <span
                                    class="text-[10px] text-base-content/65 truncate"
                                    >{device.model}</span
                                >
                            </div>
                        {/if}
                    </button>
                </li>
            {/each}
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
                        <Icon name="keyboard" class="w-4 h-4 shrink-0 " />
                        {#if !collapsed}
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-medium truncate"
                                    >{keeb.name}</span
                                >
                                <span
                                    class="text-[10px] text-base-content/65 truncate"
                                    >Keyboard</span
                                >
                            </div>
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>
        {#if !collapsed && devices.length === 0 && keyboards.length === 0}
            <p class="text-xs text-base-content/25 px-3 py-2 italic">
                No devices found
            </p>
        {/if}
    </section>

    <!-- Bottom: Support / About -->
    <section class="px-2 mt-auto">
        <div class="mx-1 mb-2 border-t border-base-300/30"></div>
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
                        <Icon name={nav.icon} class="w-4 h-4 shrink-0 " />
                        {#if !collapsed}
                            <span class="text-sm font-medium">{nav.label}</span>
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>
    </section>
</aside>

<style>
    /* Icon-rail mode: center the icon, drop the horizontal padding */
    .rail-item {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
    }
</style>
