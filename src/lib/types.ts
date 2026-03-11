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
  3: 'ColorWave',
  4: 'Starlight',
  5: 'Breathing',
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
