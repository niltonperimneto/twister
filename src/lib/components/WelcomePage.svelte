<!-- WelcomePage — aesthetic startup splash screen -->
<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import type { View } from "../types";
    import { deviceStore } from "$lib/stores/device.svelte";
    import auraLogo from "$lib/assets/aura-logo.svg";

    interface Props {
        onNavigate: (view: View) => void;
    }

    let { onNavigate }: Props = $props();

    onMount(() => {
        // Fast 1100ms play window before checking hardware status to keep the app feeling snappy
        const finalTimer = setTimeout(() => {
            const checkAndNavigate = () => {
                if (!deviceStore.loading) {
                    onNavigate("devices");
                } else {
                    setTimeout(checkAndNavigate, 50);
                }
            };
            checkAndNavigate();
        }, 1100);

        return () => clearTimeout(finalTimer);
    });
</script>

<div
    class="relative flex-1 flex flex-col items-center justify-center overflow-hidden p-8 min-h-full select-none"
    in:fade={{ duration: 400 }}
    out:fade={{ duration: 300 }}
>
    <!-- Liquid-like dynamic floating orbs in the background -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
            class="absolute left-1/4 top-1/4 w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] animate-orb-drift origin-center"
        ></div>
        <div
            class="absolute right-1/4 bottom-1/4 w-[380px] h-[380px] rounded-full bg-secondary/8 blur-[130px] animate-orb-float origin-center"
        ></div>
    </div>

    <!-- Minimalist Glassmorphic Presentation -->
    <div 
        class="relative z-10 flex flex-col items-center max-w-sm w-full p-10 rounded-3xl border border-white/5 bg-white/[0.015] backdrop-blur-2xl text-center"
        style="box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 50px -10px oklch(0.74 0.16 248 / 0.05);"
        in:fly={{ y: 15, duration: 900 }}
    >
        <!-- Floating Logo in a soft glowing orb -->
        <div class="relative w-28 h-28 flex items-center justify-center mb-8">
            <div class="absolute inset-0 rounded-full bg-primary/5 blur-md animate-pulse"></div>
            <div class="absolute inset-2 rounded-full border border-white/5 animate-pulse"></div>
            <img
                src={auraLogo}
                alt="Twister logo"
                class="w-16 h-16 relative drop-shadow-[0_0_12px_rgba(114,137,218,0.2)] animate-logo-float"
            />
        </div>

        <!-- Sleek branding with wide letter-spacing -->
        <div class="flex flex-col items-center gap-3">
            <h1 
                class="text-2xl font-light tracking-[0.4em] bg-gradient-to-r from-base-content via-base-content/90 to-base-content/50 bg-clip-text text-transparent"
                style="font-family: var(--font-display); text-shadow: 0 0 30px rgba(255,255,255,0.05);"
                in:fly={{ y: 10, duration: 800, delay: 150 }}
            >
                TWISTER
            </h1>
            
            <div 
                class="w-8 h-[1px] bg-linear-to-r from-primary to-secondary opacity-60 my-1"
                in:fade={{ duration: 600, delay: 300 }}
            ></div>

            <p 
                class="text-xs text-base-content/50 font-normal leading-relaxed tracking-wide max-w-[280px]"
                in:fly={{ y: 10, duration: 800, delay: 400 }}
            >
                Precision control. Refined design.
            </p>
        </div>

        <!-- Subtle breathing pulse loader -->
        <div 
            class="flex items-center gap-1.5 mt-8 opacity-45"
            in:fade={{ duration: 600, delay: 500 }}
        >
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            <span class="text-[8px] font-mono tracking-[0.2em] text-base-content/40 uppercase">Loading</span>
        </div>
    </div>
</div>

<style>
    @keyframes orb-drift {
        0% { transform: translate(0px, 0px) scale(1); }
        50% { transform: translate(25px, -25px) scale(1.05); }
        100% { transform: translate(0px, 0px) scale(1); }
    }
    @keyframes orb-float {
        0%, 100% { transform: translate(0px, 0px) scale(1); }
        50% { transform: translate(-25px, 25px) scale(1.03); }
    }
    @keyframes logo-float {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-4px) scale(1.02); }
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



