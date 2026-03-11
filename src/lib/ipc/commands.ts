/* Tauri IPC bridge — typed wrappers around invoke() for every command. */

import { invoke } from '@tauri-apps/api/core';
import type {
  DaemonStatus,
  DeviceSummary,
  DeviceDto,
  ProfileDto,
  ActionValueDto,
} from '$lib/types';

export async function connectDaemon(): Promise<DaemonStatus> {
  return invoke<DaemonStatus>('connect_daemon');
}

export async function listDevices(): Promise<DeviceSummary[]> {
  return invoke<DeviceSummary[]>('list_devices');
}

export async function getDevice(path: string): Promise<DeviceDto> {
  return invoke<DeviceDto>('get_device', { path });
}

export async function getProfile(path: string): Promise<ProfileDto> {
  return invoke<ProfileDto>('get_profile', { path });
}

export async function setResolutionDpi(
  path: string,
  dpiX: number,
  dpiY?: number | null,
): Promise<void> {
  return invoke('set_resolution_dpi', { path, dpiX, dpiY: dpiY ?? null });
}

export async function setResolutionActive(path: string): Promise<void> {
  return invoke('set_resolution_active', { path });
}

export async function setProfileReportRate(
  path: string,
  rate: number,
): Promise<void> {
  return invoke('set_profile_report_rate', { path, rate });
}

export async function setProfileActive(path: string): Promise<void> {
  return invoke('set_profile_active', { path });
}

export async function setButtonMapping(
  path: string,
  actionType: number,
  value: ActionValueDto,
): Promise<void> {
  return invoke('set_button_mapping', { path, actionType, value });
}

export async function setLedMode(path: string, mode: number): Promise<void> {
  return invoke('set_led_mode', { path, mode });
}

export async function setLedColor(
  path: string,
  r: number,
  g: number,
  b: number,
): Promise<void> {
  return invoke('set_led_color', { path, r, g, b });
}

export async function setLedBrightness(
  path: string,
  value: number,
): Promise<void> {
  return invoke('set_led_brightness', { path, value });
}

export async function setLedEffectDuration(
  path: string,
  ms: number,
): Promise<void> {
  return invoke('set_led_effect_duration', { path, ms });
}

export async function commitDevice(path: string): Promise<number> {
  return invoke<number>('commit_device', { path });
}

export async function detectSurfaceMode(): Promise<string> {
  return invoke<string>('detect_surface_mode');
}
