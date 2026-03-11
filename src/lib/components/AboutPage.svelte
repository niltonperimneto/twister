<!-- AboutPage — project info, credits, and GPLv3 license -->
<script lang="ts">
  import auraLogo from '$lib/assets/aura-logo.svg';
  import { invoke } from '@tauri-apps/api/core';

  async function openUrl(url: string) {
    try {
      await invoke('plugin:shell|open', { path: url });
    } catch {
      // fallback silently
    }
  }
</script>

<div class="flex-1 flex justify-center p-8 overflow-y-auto">
  <div class="max-w-lg w-full flex flex-col items-center gap-6 my-auto">
    <!-- Logo + Name -->
    <div class="flex flex-col items-center gap-3">
      <div class="relative">
        <img src={auraLogo} alt="Aura logo" class="w-14 h-14 drop-shadow-[0_0_10px_rgba(118,0,159,0.25)]" />
        <div class="absolute -inset-3 rounded-full bg-primary/10 blur-xl -z-10"></div>
      </div>
      <h1 class="text-xl font-bold tracking-wide">Twister</h1>
      <span class="badge badge-ghost badge-sm">Version 0.1.0</span>
    </div>

    <!-- Description -->
    <div class="editor-card w-full !gap-4 text-center">
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest">About the Project</h2>
      <p class="text-sm text-base-content/60 leading-relaxed">
        <span class="font-semibold text-base-content/80">Twister</span> is a modern, desktop-agnostic graphical frontend for configuring gaming mice on Linux. 
        It communicates via D-Bus with <span class="font-semibold text-base-content/80">ratbagd-rs</span>, a complete, memory-safe rewrite of the 
        original daemon in Rust. This ensures safety without garbage collection, non-blocking asynchronous event handling, and 
        a unified protocol interface for seamless device support.
      </p>
    </div>

    <!-- Technology Stack -->
    <div class="editor-card w-full !gap-3">
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest text-center">Technology Stack</h2>
      <div class="flex flex-wrap gap-2 justify-center">
        {#each ['Rust', 'Tokio', 'zbus', 'Tauri', 'Svelte', 'TypeScript', 'HID++'] as tech}
          <span class="badge badge-outline badge-sm text-base-content/50 font-mono">{tech}</span>
        {/each}
      </div>
    </div>

    <!-- Credits -->
    <div class="editor-card w-full !gap-3">
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest text-center">Credits</h2>
      <ul class="text-xs text-base-content/50 flex flex-col gap-1.5 leading-relaxed">
        <li class="flex items-center gap-2">
          <span class="w-1 h-1 rounded-full bg-primary/60 shrink-0"></span>
          <span><span class="text-base-content/70 font-medium">libratbag</span> — original C library for mouse configuration</span>
        </li>
        <li class="flex items-center gap-2">
          <span class="w-1 h-1 rounded-full bg-primary/60 shrink-0"></span>
          <span><span class="text-base-content/70 font-medium">Piper</span> — original GTK frontend and SVG artwork</span>
        </li>
      </ul>
    </div>

    <!-- License -->
    <div class="editor-card w-full !gap-3">
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest text-center">License</h2>
      <p class="text-[11px] text-base-content/50 leading-relaxed text-center">
        Twister is free software: you can redistribute it and/or modify it under the terms of the
        <button 
          onclick={() => openUrl('https://www.gnu.org/licenses/gpl-3.0.html')}
          class="font-semibold text-primary hover:text-primary-focus underline transition-colors"
        >
          GNU General Public License v3.0
        </button>.
      </p>
    </div>
  </div>
</div>
