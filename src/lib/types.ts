/* Shared TypeScript types matching the Rust DTO layer exactly. */

export type DaemonStatus =
  | { status: 'connected'; api_version: number }
  | { status: 'disconnected'; reason: string };

export interface DeviceSummary {
  path: string;
  name: string;
  model: string;
}

export interface DeviceDto {
  path: string;
  name: string;
  model: string;
  firmware_version: string;
  device_type: number;
  profiles: ProfileDto[];
}

export interface ProfileDto {
  path: string;
  index: number;
  name: string;
  is_active: boolean;
  is_dirty: boolean;
  disabled: boolean;
  report_rate: number;
  report_rates: number[];
  angle_snapping: number;
  debounce: number;
  debounces: number[];
  capabilities: number[];
  resolutions: ResolutionDto[];
  buttons: ButtonDto[];
  leds: LedDto[];
}

export interface ResolutionDto {
  path: string;
  index: number;
  dpi_x: number;
  dpi_y: number | null;
  dpi_list: number[];
  capabilities: number[];
  is_active: boolean;
  is_default: boolean;
  is_disabled: boolean;
}

export interface ButtonDto {
  path: string;
  index: number;
  action_type: number;
  action_value: ActionValueDto;
  action_types: number[];
}

export type ActionValueDto =
  | { kind: 'none' }
  | { kind: 'button'; button: number }
  | { kind: 'special'; special: number }
  | { kind: 'key'; keycode: number }
  | { kind: 'macro'; entries: [number, number][] }
  | { kind: 'unknown' };

export interface LedDto {
  path: string;
  index: number;
  mode: number;
  modes: number[];
  color: RgbDto;
  secondary_color: RgbDto;
  tertiary_color: RgbDto;
  color_depth: number;
  effect_duration: number;
  brightness: number;
}

export interface RgbDto {
  r: number;
  g: number;
  b: number;
}

/* LED mode enum matching ratbagd-rs LedMode */
export const LED_MODES: Record<number, string> = {
  0: 'Off',
  1: 'Solid',
  2: 'Cycle',
  3: 'Breathing',
  4: 'ColorWave',
  5: 'Starlight',
  6: 'TriColor',
};

/* Action type enum matching ratbagd-rs ActionType */
export const ACTION_TYPES: Record<number, string> = {
  0: 'None',
  1: 'Button',
  2: 'Special',
  3: 'Key',
  4: 'Macro',
  1000: 'Unknown',
};

/* Common standard mouse buttons mapping */
export const COMMON_BUTTONS: Record<number, string> = {
  1: 'Left Click',
  2: 'Right Click',
  3: 'Middle Click',
  4: 'Scroll Up',
  5: 'Scroll Down',
  8: 'Back',
  9: 'Forward',
};

/* Special action constants matching libratbag ratbag_button_action_special */
const SPECIAL_BASE = 1 << 30; // 1073741824
export const SPECIAL_ACTIONS: Record<number, string> = {
  [SPECIAL_BASE]: 'Unknown',
  [SPECIAL_BASE + 1]: 'Double Click',
  [SPECIAL_BASE + 2]: 'Wheel Left',
  [SPECIAL_BASE + 3]: 'Wheel Right',
  [SPECIAL_BASE + 4]: 'Wheel Up',
  [SPECIAL_BASE + 5]: 'Wheel Down',
  [SPECIAL_BASE + 6]: 'Ratchet Mode Switch',
  [SPECIAL_BASE + 7]: 'Resolution Cycle Up',
  [SPECIAL_BASE + 8]: 'Resolution Cycle Down',
  [SPECIAL_BASE + 9]: 'Resolution Up',
  [SPECIAL_BASE + 10]: 'Resolution Down',
  [SPECIAL_BASE + 11]: 'Resolution Alternate',
  [SPECIAL_BASE + 12]: 'Resolution Default',
  [SPECIAL_BASE + 13]: 'Profile Cycle Up',
  [SPECIAL_BASE + 14]: 'Profile Cycle Down',
  [SPECIAL_BASE + 15]: 'Profile Up',
  [SPECIAL_BASE + 16]: 'Profile Down',
  [SPECIAL_BASE + 17]: 'Second Mode',
  [SPECIAL_BASE + 18]: 'Battery Level',
};
