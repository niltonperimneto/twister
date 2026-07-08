/* Human-readable labels for ratbagd button actions — shared between the
 * ButtonMapper editor and the MouseVisualizer callouts. */

import type { ButtonDto } from '$lib/types';
import { COMMON_BUTTONS, SPECIAL_ACTIONS } from '$lib/types';

export function formatButtonAction(btn: ButtonDto): string {
  const v = btn.action_value;
  switch (v.kind) {
    case 'none':
      return 'None';
    case 'button':
      return COMMON_BUTTONS[v.button] ?? `Button ${v.button}`;
    case 'special':
      return SPECIAL_ACTIONS[v.special] ?? `Special ${v.special}`;
    case 'key':
      return `Key ${v.keycode}`;
    case 'macro':
      return `Macro (${v.entries.length} steps)`;
    case 'unknown':
      return 'Unknown';
    default:
      return '—';
  }
}
