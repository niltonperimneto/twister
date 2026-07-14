<!-- DonatePage — support the project, repos, and donation links -->
<script lang="ts">
    import { fade } from "svelte/transition";
    import { DUR, duration } from "$lib/motion";
    import { openUrl } from "$lib/ipc/commands";
    import Icon from "./Icon.svelte";
</script>

<div
    class="flex-1 flex justify-center p-8 overflow-y-auto"
    in:fade={{ duration: duration(DUR.base) }}
    out:fade={{ duration: 150 }}
>
    <div
        class="max-w-md w-full flex flex-col items-center gap-6 text-center my-auto"
    >
        <!-- Heart icon -->
        <div class="relative">
            <Icon name="heart" class="w-16 h-16" />
            <div
                class="heart-halo absolute -inset-4 rounded-full bg-error/5 blur-xl -z-10"
            ></div>
        </div>

        <div class="flex flex-col gap-2">
            <h1 class="text-xl font-bold">Support & Repositories</h1>
            <p class="text-sm text-base-content/50 leading-relaxed">
                Twister and libratbag-rs are free, open-source projects built
                for the Linux gaming community.
            </p>
        </div>

        <!-- Donate -->
        <div class="editor-card w-full gap-4!">
            <h2
                class="text-xs font-semibold uppercase tracking-widest text-base-content/40"
            >
                Donate
            </h2>
            <p class="text-xs text-base-content/40 leading-relaxed text-left">
                If Twister saves you time or frustration, consider buying the
                maintainer a coffee. Every contribution helps fund continued
                development, new device support, and bug fixes.
            </p>
            <button
                onclick={() =>
                    openUrl("https://github.com/sponsors/niltonperimneto")}
                class="btn btn-primary gap-2 w-full"
            >
                <Icon name="heart" class="w-4 h-4" />
                Sponsor on GitHub
            </button>
        </div>

        <!-- Repositories -->
        <div class="editor-card w-full gap-4!">
            <h2
                class="text-xs font-semibold uppercase tracking-widest text-base-content/40"
            >
                Source Code
            </h2>
            <p class="text-xs text-base-content/40 leading-relaxed text-left">
                Both projects are fully open source. Star the repositories, open
                issues, or submit pull requests.
            </p>
            <div class="flex flex-col gap-2.5">
                <!-- Twister repo -->
                <button
                    onclick={() =>
                        openUrl("https://github.com/niltonperimneto/twister/")}
                    class="btn gap-2 w-full"
                >
                    <Icon name="github" class="w-4 h-4" />
                    Twister: Mouse Configuration GUI
                    <Icon name="external-link" class="w-3 h-3 ml-auto opacity-40" />
                </button>

                <!-- libratbag-rs repo -->
                <button
                    onclick={() =>
                        openUrl(
                            "https://github.com/niltonperimneto/libratbag-rs",
                        )}
                    class="btn gap-2 w-full"
                >
                    <Icon name="github" class="w-4 h-4" />
                    libratbag-rs: Rust Daemon
                    <Icon name="external-link" class="w-3 h-3 ml-auto opacity-40" />
                </button>
            </div>
        </div>

        <!-- Ways to support -->
        <div class="editor-card w-full gap-4!">
            <h2
                class="text-xs font-semibold uppercase tracking-widest text-base-content/40"
            >
                Other Ways to Contribute
            </h2>

            <div class="flex flex-col gap-3 text-left">
                <div class="flex items-start gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0"
                    >
                        <Icon name="star" class="w-4 h-4 text-warning" />
                    </div>
                    <div>
                        <p class="text-sm font-medium">Star the Repositories</p>
                        <p class="text-xs text-base-content/40">
                            Show your support on GitHub: every star helps
                            visibility.
                        </p>
                    </div>
                </div>

                <div class="flex items-start gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center shrink-0"
                    >
                        <Icon name="clock" class="w-4 h-4 text-info" />
                    </div>
                    <div>
                        <p class="text-sm font-medium">Report Issues</p>
                        <p class="text-xs text-base-content/40">
                            Found a bug or have a feature request? Open an issue
                            on the repository.
                        </p>
                    </div>
                </div>

                <div class="flex items-start gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0"
                    >
                        <Icon name="user-plus" class="w-4 h-4 text-success" />
                    </div>
                    <div>
                        <p class="text-sm font-medium">Contribute Code</p>
                        <p class="text-xs text-base-content/40">
                            Pull requests for fixes, features, and device
                            support are always welcome.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <p class="text-xs text-base-content/30 leading-relaxed">
            Thank you for being part of the open-source community.
        </p>
    </div>
</div>
