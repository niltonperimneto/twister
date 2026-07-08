<!-- AboutPage — clean, compact project details & preferences & credits (GPLv3) -->
<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { getVersion } from "@tauri-apps/api/app";
    import auraLogo from "$lib/assets/aura-logo.svg";
    import { openUrl } from "$lib/ipc/commands";
    import { updaterStore } from "$lib/stores/updater.svelte";

    const updater = updaterStore;

    /* Human-friendly "5 min ago" timestamp used for last-checked display. */
    function relativeTime(ts: number | null): string {
        if (ts === null) return "never";
        const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (secs < 60) return "just now";
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} h ago`;
        return `${Math.floor(hrs / 24)} d ago`;
    }

    let version: string = $state("");
    getVersion().then((v) => (version = v));

    /* The splash plays automatically on first run only; this opt-in makes
       it play on every launch */
    let playStartupAnimation = $state(false);

    onMount(() => {
        playStartupAnimation =
            localStorage.getItem("twister_play_startup_animation") === "true";
    });

    function handleToggleAnimation(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        playStartupAnimation = checked;
        localStorage.setItem("twister_play_startup_animation", String(checked));
    }
</script>

<div
    class="flex-1 flex justify-center p-8 overflow-y-auto"
    in:fade={{ duration: 250 }}
    out:fade={{ duration: 150 }}
>
    <div class="max-w-md w-full flex flex-col items-center gap-6 my-auto">
        <!-- Unified Premium Card -->
        <div class="editor-card w-full items-center text-center p-6 gap-5">
            <!-- Animated interactive logo -->
            <div class="relative group cursor-pointer">
                <div class="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500 animate-pulse"></div>
                <img
                    src={auraLogo}
                    alt="Twister logo"
                    class="w-16 h-16 relative transition-transform duration-700 ease-out hover:rotate-[360deg] active:scale-95"
                />
            </div>

            <!-- Branding -->
            <div class="flex flex-col items-center gap-1.5">
                <h1 class="text-xl font-bold tracking-wider">Twister</h1>
                <span class="badge badge-primary badge-outline badge-sm font-mono font-bold tracking-wide">
                    Version {version}
                </span>
            </div>

            <!-- Tagline description -->
            <p class="text-xs text-base-content/60 leading-relaxed max-w-xs">
                A desktop-agnostic customizer for Linux gaming devices. Boasting backwards compatibility with <span class="font-semibold text-base-content/85">libratbag</span> and evolving towards <span class="font-semibold text-base-content/85">libratbag-rs</span>.
            </p>

            <!-- GitHub Action Button -->
            <button
                onclick={() => openUrl("https://github.com/niltonperimneto/libratbag-rs")}
                class="btn btn-xs gap-1.5"
            >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13v22"></path>
                </svg>
                GitHub Repository
            </button>

            <!-- Stack Badges -->
            <div class="flex flex-wrap gap-1.5 justify-center w-full mt-1">
                {#each ["Tauri", "Svelte", "Rust", "TypeScript", "D-Bus", "DaisyUI"] as tech}
                    <span class="badge badge-neutral badge-xs font-mono text-[9px] opacity-70">
                        {tech}
                    </span>
                {/each}
            </div>

            <!-- Accordion items to tuck away long descriptions and settings -->
            <div class="w-full flex flex-col gap-2 mt-2">
                <!-- Updates Collapse -->
                <div class="collapse collapse-arrow bg-base-300/35 border border-base-content/5 rounded-lg text-left">
                    <input type="checkbox" id="updates-collapse-toggle" class="peer" checked={updater.hasUpdate} />
                    <div class="collapse-title text-[11px] font-semibold py-2.5 px-4 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <svg class="w-3.5 h-3.5 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10"/>
                                <polyline points="1 20 1 14 7 14"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Updates
                        </div>
                        {#if updater.hasUpdate}
                            <span class="badge badge-primary badge-xs">
                                v{updater.available?.version} ready
                            </span>
                        {/if}
                    </div>
                    <div class="collapse-content px-4 pb-3 flex flex-col gap-2.5 text-[11px]">
                        <div class="flex items-center justify-between border-b border-base-content/5 pb-2">
                            <div class="flex flex-col">
                                <span class="text-xs font-medium text-base-content/85">Installed version</span>
                                <span class="text-[9px] text-base-content/40 font-mono">
                                    Last checked: {relativeTime(updater.lastChecked)}
                                </span>
                            </div>
                            <span class="badge badge-ghost badge-sm font-mono">v{version}</span>
                        </div>

                        {#if updater.status === 'available' && updater.available}
                            <div class="flex flex-col gap-1.5">
                                <span class="text-xs font-medium text-base-content/85">
                                    Version {updater.available.version} is available.
                                </span>
                                {#if updater.available.notes}
                                    <p class="text-[10px] text-base-content/55 leading-relaxed whitespace-pre-wrap line-clamp-6">
                                        {updater.available.notes}
                                    </p>
                                {/if}
                            </div>
                            <div class="flex gap-2">
                                <button
                                    onclick={() => updater.installNow()}
                                    class="btn btn-primary btn-xs gap-1.5 flex-1"
                                >
                                    Install &amp; restart
                                </button>
                                <button
                                    onclick={() => updater.checkNow()}
                                    class="btn btn-ghost btn-xs"
                                    disabled={updater.status !== 'available'}
                                >
                                    Recheck
                                </button>
                            </div>
                        {:else if updater.status === 'downloading'}
                            <div class="flex items-center gap-2 text-base-content/70">
                                <span class="loading loading-spinner loading-xs"></span>
                                Downloading and verifying…
                            </div>
                        {:else if updater.status === 'ready'}
                            <div class="flex items-center gap-2 text-base-content/70">
                                <span class="loading loading-spinner loading-xs"></span>
                                Restarting…
                            </div>
                        {:else if updater.status === 'error'}
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[10px] text-error/80 leading-relaxed">
                                    {updater.error}
                                </span>
                                <button
                                    onclick={() => updater.checkNow()}
                                    class="btn btn-xs self-start"
                                >
                                    Retry
                                </button>
                            </div>
                        {:else}
                            <div class="flex items-center gap-2">
                                <button
                                    onclick={() => updater.checkNow()}
                                    class="btn btn-xs gap-1.5"
                                    disabled={updater.status === 'checking'}
                                >
                                    {#if updater.status === 'checking'}
                                        <span class="loading loading-spinner loading-xs"></span>
                                        Checking…
                                    {:else}
                                        Check for updates
                                    {/if}
                                </button>
                                <span class="text-[10px] text-base-content/35 italic">
                                    {updater.status === 'checking' ? '' : 'You are on the latest version.'}
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Preferences Collapse -->
                <div class="collapse collapse-arrow bg-base-300/35 border border-base-content/5 rounded-lg text-left">
                    <input type="checkbox" id="preferences-collapse-toggle" class="peer" checked />
                    <div class="collapse-title text-[11px] font-semibold py-2.5 px-4 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-accent/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        App Preferences
                    </div>
                    <div class="collapse-content px-4 pb-3 flex flex-col gap-2">
                        <div class="flex items-center justify-between py-1 border-b border-base-content/5">
                            <div class="flex flex-col">
                                <span class="text-xs font-medium text-base-content/85">Play Startup Animation</span>
                                <span class="text-[9px] text-base-content/40">Show the boot scan screen on every launch, not just the first run</span>
                            </div>
                            <input 
                                type="checkbox" 
                                class="toggle toggle-primary toggle-xs cursor-pointer" 
                                checked={playStartupAnimation}
                                onchange={handleToggleAnimation}
                            />
                        </div>
                    </div>
                </div>

                <!-- Credits Collapse -->
                <div class="collapse collapse-arrow bg-base-300/35 border border-base-content/5 rounded-lg text-left">
                    <input type="checkbox" id="credits-collapse-toggle" class="peer" />
                    <div class="collapse-title text-[11px] font-semibold py-2.5 px-4 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Credits & Core Projects
                    </div>
                    <div class="collapse-content px-4 pb-3">
                        <ul class="text-[10px] text-base-content/50 flex flex-col gap-2 leading-relaxed">
                            <li>
                                <span class="font-medium text-base-content/75">libratbag</span>: Core C configuration library.
                            </li>
                            <li>
                                <span class="font-medium text-base-content/75">Piper</span>: Reference desktop app and layouts.
                            </li>
                            <li>
                                <span class="font-medium text-base-content/75">VIA</span>: Keyboard reading mechanism & definitions (GPL-3.0).
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- License Collapse -->
                <div class="collapse collapse-arrow bg-base-300/35 border border-base-content/5 rounded-lg text-left">
                    <input type="checkbox" id="license-collapse-toggle" class="peer" />
                    <div class="collapse-title text-[11px] font-semibold py-2.5 px-4 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-secondary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Licensing & Legal
                    </div>
                    <div class="collapse-content px-4 pb-3 text-[10px] text-base-content/50 leading-relaxed flex flex-col gap-1.5">
                        <p>Copyright © 2025 Nilton Perim Neto. All rights reserved.</p>
                        <p>
                            Twister is free software: you can redistribute and/or modify it under the terms of the 
                            <button
                                onclick={() => openUrl("https://www.gnu.org/licenses/gpl-3.0.html")}
                                class="text-primary hover:underline font-medium font-sans"
                            >
                                GNU General Public License v3.0
                            </button>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
