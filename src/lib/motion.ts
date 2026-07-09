/* Shared motion vocabulary for Svelte transitions.
 *
 * CSS animations/transitions inherit the app-wide tokens in app.css
 * (--ease-out, --dur-*) and are neutralised by the global
 * prefers-reduced-motion block there. Svelte transitions animate via
 * inline styles, so that CSS override never reaches them — every
 * `fly`/`fade` duration must come through `duration()` instead, which
 * collapses to 0 when the user asks for reduced motion.
 */
import { expoOut } from "svelte/easing";

/* Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1) in app.css. */
export const easeOut = expoOut;

/* Duration scale, in ms — mirrors --dur-* in app.css. */
export const DUR = {
    /* micro-interactions: toasts, tab content swaps out */
    fast: 150,
    /* standard: view changes, panel entrances */
    base: 250,
    /* emphasis: page-level fades, splash choreography */
    slow: 400,
} as const;

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== "undefined" &&
        window.matchMedia(reduceMotionQuery).matches
    );
}

/* Duration for a Svelte transition: the requested length, or 0 when the
 * user prefers reduced motion (element still appears, just instantly). */
export function duration(ms: number): number {
    return prefersReducedMotion() ? 0 : ms;
}
