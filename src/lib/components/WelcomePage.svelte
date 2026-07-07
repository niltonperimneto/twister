<!-- WelcomePage — aesthetic startup splash screen.
     Skippable (click, Enter/Space/Escape), announces itself as a status to
     screen readers, and collapses to an instant hand-off when the user
     prefers reduced motion. -->
<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import type { View } from "../types";
    import { deviceStore } from "$lib/stores/device.svelte";
    import { DUR, duration, easeOut, prefersReducedMotion } from "$lib/motion";
    import auraLogo from "$lib/assets/aura-logo.svg";

    interface Props {
        onNavigate: (view: View) => void;
    }

    let { onNavigate }: Props = $props();

    /* With reduced motion there is nothing to watch — hand off almost
       immediately instead of holding an effectively static frame. */
    const SPLASH_MS = prefersReducedMotion() ? 300 : 1100;

    let navigated = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    function finish() {
        if (navigated) return;
        navigated = true;
        if (pollTimer) clearTimeout(pollTimer);
        onNavigate("devices");
    }

    /* Wait for the device store before navigating so the editor doesn't
       flash an empty state, but never against the user's will: an explicit
       skip (click/key) navigates straight away. */
    function finishWhenReady() {
        if (navigated) return;
        if (!deviceStore.loading) {
            finish();
        } else {
            pollTimer = setTimeout(finishWhenReady, 50);
        }
    }

    function skip(e?: KeyboardEvent) {
        if (e && e.key !== "Enter" && e.key !== " " && e.key !== "Escape") {
            return;
        }
        e?.preventDefault();
        finish();
    }

    onMount(() => {
        const timer = setTimeout(finishWhenReady, SPLASH_MS);
        return () => {
            clearTimeout(timer);
            if (pollTimer) clearTimeout(pollTimer);
        };
    });
</script>

<svelte:window onkeydown={skip} />

<!-- The whole splash is one click target: any interaction skips ahead.
     Keyboard users get the same escape via the window keydown handler above
     and the visible "skip" button below, so the div's click handler is a
     pointer-only convenience. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div
    class="relative flex-1 flex flex-col items-center justify-center overflow-hidden p-8 min-h-full select-none cursor-pointer"
    role="status"
    aria-label="Twister is starting"
    onclick={() => finish()}
    in:fade={{ duration: duration(DUR.slow), easing: easeOut }}
    out:fade={{ duration: duration(DUR.base), easing: easeOut }}
>
    <!-- Liquid-like dynamic floating orbs in the background -->
    <div
        class="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
    >
        <div
            class="absolute left-1/4 top-1/4 w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] animate-orb-drift origin-center"
        ></div>
        <div
            class="absolute right-1/4 bottom-1/4 w-[380px] h-[380px] rounded-full bg-secondary/8 blur-[130px] animate-orb-float origin-center"
        ></div>
    </div>

    <!-- Minimalist glassmorphic card -->
    <div
        class="relative z-10 flex flex-col items-center max-w-sm w-full p-10 rounded-3xl border border-white/5 bg-white/[0.015] backdrop-blur-2xl text-center"
        style="box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 50px -10px oklch(0.74 0.16 248 / 0.05);"
        in:fly={{ y: 15, duration: duration(2 * DUR.slow), easing: easeOut }}
    >
        <!-- Floating logo in a soft glowing orb -->
        <div
            class="relative w-28 h-28 flex items-center justify-center mb-8"
            aria-hidden="true"
        >
            <div
                class="absolute inset-0 rounded-full bg-primary/5 blur-md animate-pulse"
            ></div>
            <div
                class="absolute inset-2 rounded-full border border-white/5 animate-pulse"
            ></div>
            <img
                src={auraLogo}
                alt=""
                class="w-16 h-16 relative drop-shadow-[0_0_12px_rgba(114,137,218,0.2)] animate-logo-float"
            />
        </div>

        <!-- Sleek branding with wide letter-spacing -->
        <div class="flex flex-col items-center gap-3">
            <h1
                class="text-2xl font-light tracking-[0.4em] bg-gradient-to-r from-base-content via-base-content/90 to-base-content/50 bg-clip-text text-transparent"
                style="font-family: var(--font-display); text-shadow: 0 0 30px rgba(255,255,255,0.05);"
                in:fly={{
                    y: 10,
                    duration: duration(2 * DUR.slow),
                    delay: duration(DUR.fast),
                    easing: easeOut,
                }}
            >
                TWISTER
            </h1>

            <div
                class="w-8 h-[1px] bg-linear-to-r from-primary to-secondary opacity-60 my-1"
                aria-hidden="true"
                in:fade={{
                    duration: duration(DUR.slow),
                    delay: duration(2 * DUR.fast),
                }}
            ></div>

            <p
                class="text-xs text-base-content/50 font-normal leading-relaxed tracking-wide max-w-[280px]"
                in:fly={{
                    y: 10,
                    duration: duration(2 * DUR.slow),
                    delay: duration(DUR.base + DUR.fast),
                    easing: easeOut,
                }}
            >
                Precision control. Refined design.
            </p>
        </div>

        <!-- Subtle breathing pulse loader -->
        <div
            class="flex items-center gap-1.5 mt-8 opacity-45"
            in:fade={{
                duration: duration(DUR.slow),
                delay: duration(2 * DUR.base),
            }}
        >
            <span
                class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"
                aria-hidden="true"
            ></span>
            <span
                class="text-[8px] font-mono tracking-[0.2em] text-base-content/40 uppercase"
                >Loading</span
            >
        </div>
    </div>

    <!-- Accessible skip control; also documents the click-to-skip gesture -->
    <button
        type="button"
        class="skip-hint relative z-10 mt-6 text-[10px] tracking-[0.15em] uppercase text-base-content/25 bg-transparent border-none cursor-pointer"
        onclick={(e) => {
            e.stopPropagation();
            finish();
        }}
        in:fade={{
            duration: duration(DUR.slow),
            delay: duration(3 * DUR.base),
        }}
    >
        Click anywhere to skip
    </button>
</div>

<style>
    /* Splash-only ambient motion, on the shared easing/duration language.
       All three are decorative and disabled by the global
       prefers-reduced-motion block in app.css. */
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

    .skip-hint {
        transition: color var(--dur-fast) ease;
    }
    .skip-hint:hover,
    .skip-hint:focus-visible {
        color: oklch(0.92 0 0 / 0.6);
    }
</style>
