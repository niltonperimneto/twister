<!-- WelcomePage — animated landing view, consistent with app design system -->
<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import type { View } from './Sidebar.svelte';
  import auraLogo from '$lib/assets/aura-logo.svg';

  interface Props {
    onNavigate: (view: View) => void;
  }

  let { onNavigate }: Props = $props();
</script>

<div class="relative flex-1 flex flex-col items-center overflow-y-auto p-8">
  <!-- Animated background orbs — subtle ambient glow -->
  <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <div class="absolute left-1/4 top-1/4 w-[320px] h-[320px] rounded-full bg-primary/10 blur-[100px] animate-aura-spin origin-bottom-right"></div>
    <div class="absolute right-1/4 bottom-1/4 w-[260px] h-[260px] rounded-full bg-secondary/10 blur-[100px] animate-aura-float origin-top-left"></div>
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full bg-accent/10 blur-[80px] animate-aura-pulse"></div>
  </div>

  <div class="relative z-10 max-w-lg w-full flex flex-col items-center gap-6 my-auto">
    <!-- Logo + Title -->
    <div class="flex flex-col items-center gap-3" in:fly={{ y: -30, duration: 500 }}>
      <div class="relative">
        <img src={auraLogo} alt="Aura logo" class="w-28 h-28 drop-shadow-[0_0_18px_rgba(118,0,159,0.35)] aura-logo-sharp" />
        <div class="absolute -inset-6 rounded-full bg-primary/10 blur-2xl -z-10"></div>
      </div>
      <h1 class="text-2xl font-bold tracking-wide bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
        Welcome to Twister
      </h1>
      <p class="text-sm text-base-content/60 leading-relaxed text-center max-w-sm" in:fade={{ duration: 500, delay: 200 }}>
        A desktop-agnostic GUI for Linux gaming mice — built on
        <span class="font-semibold text-base-content/80">libratbag-rs</span>,
        a ground-up rewrite of the configuration stack in
        <span class="font-semibold text-base-content/80">memory-safe Rust</span>.
      </p>
    </div>

    <!-- What makes this different -->
    <div class="editor-card w-full !gap-4" in:fly={{ y: 30, duration: 600, delay: 150 }}>
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest text-center">Why Twister?</h2>
      <div class="flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <!-- Rust gear icon -->
            <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium">Rewritten in Rust</p>
            <p class="text-xs text-base-content/40">libratbag-rs replaces the legacy C daemon with memory-safe, fearlessly concurrent code — no more undefined behavior or fragile pointer chains.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium">Desktop Agnostic</p>
            <p class="text-xs text-base-content/40">Works on any Linux desktop — GNOME, KDE, Sway, or bare WM. No GNOME Shell extensions or KDE widgets required.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium">Modern D-Bus Protocol</p>
            <p class="text-xs text-base-content/40">Communicates with hardware via the standardized ratbagd D-Bus interface — the same protocol used by the broader libratbag ecosystem.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Start -->
    <div class="editor-card w-full !gap-4" in:fly={{ y: 30, duration: 600, delay: 300 }}>
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-widest text-center">Quick Start</h2>

      <div class="flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <span class="text-sm font-bold text-primary">1</span>
          </div>
          <div>
            <p class="text-sm font-medium">Connect your mouse</p>
            <p class="text-xs text-base-content/40">Plug in a supported gaming mouse via USB or wireless receiver.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
            <span class="text-sm font-bold text-secondary">2</span>
          </div>
          <div>
            <p class="text-sm font-medium">Select a device</p>
            <p class="text-xs text-base-content/40">Open the sidebar and choose your mouse from the Devices list.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <span class="text-sm font-bold text-accent">3</span>
          </div>
          <div>
            <p class="text-sm font-medium">Customize & apply</p>
            <p class="text-xs text-base-content/40">Adjust DPI, button mappings, and LED effects, then hit Apply to save.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div in:fly={{ y: 30, duration: 600, delay: 500 }}>
      <button
        onclick={() => onNavigate('devices')}
        class="btn btn-primary btn-sm gap-1.5"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="6" /><line x1="12" y1="2" x2="12" y2="10" /></svg>
        Go to Devices
      </button>
    </div>
  </div>

  <style>
    @keyframes aura-spin {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.05); }
      100% { transform: rotate(360deg) scale(1); }
    }
    @keyframes aura-float {
      0%, 100% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(20px, -30px) scale(1.05); }
      66% { transform: translate(-15px, 15px) scale(0.95); }
    }
    @keyframes aura-pulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.03); }
    }
    .animate-aura-spin { animation: aura-spin 30s ease-in-out infinite; }
    .animate-aura-float { animation: aura-float 24s ease-in-out infinite; }
    .animate-aura-pulse { animation: aura-pulse 10s ease-in-out infinite; }
    .aura-logo-sharp {
      image-rendering: crisp-edges;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: optimizeQuality;
    }
  </style>
</div>
