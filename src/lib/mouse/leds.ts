/* LED capability heuristic — shared between the App tab bar and the
 * MouseVisualizer so they can never disagree about whether a device
 * has lighting. */

import type { ProfileDto } from '$lib/types';

/* ratbagd reports LED entries even for unlit mice; treat a device as
 * LED-capable only when some LED supports (or is in) a non-off mode. */
export function profileHasLeds(profile: ProfileDto): boolean {
  return profile.leds.some(
    (l) => l.modes.some((m) => m !== 0) || (l.modes.length === 0 && l.mode !== 0),
  );
}
