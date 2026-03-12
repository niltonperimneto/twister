<!-- DonatePage — support the project, repos, and donation links -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { invoke } from '@tauri-apps/api/core';

  async function openUrl(url: string) {
    try {
      await invoke('plugin:shell|open', { path: url });
    } catch {
      // fallback: do nothing silently
    }
  }
</script>

<div class="flex-1 flex justify-center p-8 overflow-y-auto" in:fade={{ duration: 250 }} out:fade={{ duration: 150 }}>
  <div class="max-w-md w-full flex flex-col items-center gap-6 text-center my-auto">
    <!-- Heart icon -->
    <div class="relative">
      <svg class="w-16 h-16 text-error/70" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <div class="absolute -inset-4 rounded-full bg-error/5 blur-xl -z-10"></div>
    </div>

    <div class="flex flex-col gap-2">
      <h1 class="text-xl font-bold">Support & Repositories</h1>
      <p class="text-sm text-base-content/50 leading-relaxed">
        Twister and libratbag-rs are free, open-source projects built for the Linux gaming community.
      </p>
    </div>

    <!-- Donate -->
    <div class="editor-card w-full !gap-4">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-base-content/40">Donate</h2>
      <p class="text-xs text-base-content/40 leading-relaxed text-left">
        If Twister saves you time or frustration, consider buying the maintainer a coffee. Every contribution
        helps fund continued development, new device support, and bug fixes.
      </p>
      <button
        onclick={() => openUrl('https://github.com/sponsors/niltonperimneto')}
        class="btn btn-primary gap-2 w-full"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        Sponsor on GitHub
      </button>
    </div>

    <!-- Repositories -->
    <div class="editor-card w-full !gap-4">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-base-content/40">Source Code</h2>
      <p class="text-xs text-base-content/40 leading-relaxed text-left">
        Both projects are fully open source. Star the repositories, open issues, or submit pull requests.
      </p>
      <div class="flex flex-col gap-2.5">
        <!-- Twister repo -->
        <button
          onclick={() => openUrl('https://github.com/niltonperimneto/twister/')}
          class="btn gap-2 w-full"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.484 17.522 2 12 2z"/>
          </svg>
          Twister: Mouse Configuration GUI
          <svg class="w-3 h-3 ml-auto opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>

        <!-- libratbag-rs repo -->
        <button
          onclick={() => openUrl('https://github.com/niltonperimneto/libratbag-rs')}
          class="btn gap-2 w-full"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.484 17.522 2 12 2z"/>
          </svg>
          libratbag-rs: Rust Daemon
          <svg class="w-3 h-3 ml-auto opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>

    <!-- Ways to support -->
    <div class="editor-card w-full !gap-4">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-base-content/40">Other Ways to Contribute</h2>

      <div class="flex flex-col gap-3 text-left">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div>
            <p class="text-sm font-medium">Star the Repositories</p>
            <p class="text-xs text-base-content/40">Show your support on GitHub: every star helps visibility.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div>
            <p class="text-sm font-medium">Report Issues</p>
            <p class="text-xs text-base-content/40">Found a bug or have a feature request? Open an issue on the repository.</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <div>
            <p class="text-sm font-medium">Contribute Code</p>
            <p class="text-xs text-base-content/40">Pull requests for fixes, features, and device support are always welcome.</p>
          </div>
        </div>
      </div>
    </div>

    <p class="text-xs text-base-content/30 leading-relaxed">
      Thank you for being part of the open-source community.
    </p>
  </div>
</div>
