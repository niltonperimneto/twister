/* Global reactive device store — Svelte 5 Runes class pattern.
 *
 * This module owns all device/profile/resolution/button/LED state.
 * Components read $state fields directly; mutations go through the IPC
 * bridge and then update local state optimistically.
 *
 * Uses the class-based $state pattern recommended by the Svelte 5 docs
 * for shared singleton stores. */

import {
  connectDaemon,
  listDevices,
  getDevice,
  commitDevice,
} from '$lib/ipc/commands';
import { listen } from '@tauri-apps/api/event';
import type {
  DaemonStatus,
  DeviceSummary,
  DeviceDto,
  ProfileDto,
} from '$lib/types';

/* ------------------------------------------------------------------ */
/* Singleton store class                                               */
/* ------------------------------------------------------------------ */

class DeviceStore {
  /* Core reactive state */
  daemonStatus: DaemonStatus = $state({ status: 'disconnected', reason: 'Not initialised' });
  devices: DeviceSummary[] = $state([]);
  activeDevicePath: string | null = $state(null);
  activeDevice: DeviceDto | null = $state(null);
  activeProfileIndex: number = $state(0);
  loading: boolean = $state(false);
  error: string | null = $state(null);
  private unlistenResync: (() => void) | null = null;

  /* Derived state */
  readonly isConnected: boolean = $derived(this.daemonStatus.status === 'connected');

  readonly activeProfile: ProfileDto | null = $derived(
    this.activeDevice?.profiles.find((p) => p.index === this.activeProfileIndex) ?? null,
  );

  readonly profileCount: number = $derived(this.activeDevice?.profiles.length ?? 0);

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  async init(): Promise<void> {
    this.loading = true;
    this.error = null;
    console.log('[aura] init() starting');
    try {
      const status = await connectDaemon();
      console.log('[aura] connectDaemon result:', JSON.stringify(status));

      if (status.status === 'connected') {
        this.daemonStatus = status;

        /* ratbagd may still be enumerating devices right after D-Bus
         * activation.  The G403 Hero's vendor HID++ interface can take
         * up to 120s to probe.  Poll with escalating delays so that
         * fast devices appear immediately while slow ones still get a
         * chance.  Total wait ≈ 30s (1+1+2+2+4+4+8+8 = 30). */
        let devList = await listDevices();
        const delays = [1000, 1000, 2000, 2000, 4000, 4000, 8000, 8000];
        for (let attempt = 0; devList.length === 0 && attempt < delays.length; attempt++) {
          console.log(`[aura] 0 devices, retry ${attempt + 1}/${delays.length}…`);
          await new Promise((r) => setTimeout(r, delays[attempt]));
          devList = await listDevices();
        }
        console.log('[aura] listDevices result:', JSON.stringify(devList));

        this.devices = devList;

        if (devList.length > 0) {
          /* Pre-fetch each device to filter out "ghost" entries that the
           * daemon registered but failed to probe (0 buttons + 0 LEDs +
           * 0 resolutions across every profile).  These appear when the
           * wrong hidraw interface is registered before the fix lands in
           * the daemon binary. */
          const loaded: { summary: typeof devList[number]; dto: DeviceDto }[] = [];
          for (const s of devList) {
            try {
              const dto = await getDevice(s.path);
              const hasCaps = dto.profiles.some(
                (p) => p.buttons.length > 0 || p.leds.length > 0 || p.resolutions.length > 0,
              );
              if (hasCaps) {
                loaded.push({ summary: s, dto });
              } else {
                console.warn(`[aura] Filtering ghost device ${s.path} (0 capabilities)`);
              }
            } catch (e) {
              console.warn(`[aura] Skipping ${s.path}: ${e}`);
            }
          }

          this.devices = loaded.map((l) => l.summary);

          if (loaded.length > 0) {
            /* Use the already-fetched DeviceDto to avoid a redundant D-Bus round-trip */
            this.activeDevicePath = loaded[0].summary.path;
            this.activeDevice = loaded[0].dto;
            this.activeProfileIndex =
              loaded[0].dto.profiles.find((p) => p.is_active)?.index ?? 0;
            console.log(
              '[aura] selectDevice done:',
              this.activeDevice.name,
              'profile:',
              this.activeProfileIndex,
            );
          }
        }
      } else {
        this.daemonStatus = status;
      }
    } catch (e) {
      console.error('[aura] init() error:', e);
      this.error = String(e);
      this.daemonStatus = { status: 'disconnected', reason: String(e) };
    } finally {
      this.loading = false;
      console.log(
        '[aura] init() done, daemonStatus:', JSON.stringify(this.daemonStatus),
        'devices:', this.devices.length,
      );
    }

    /* Subscribe to push events from the D-Bus signal watcher */
    if (this.isConnected && !this.unlistenResync) {
      listen('ratbag:resync', () => {
        console.log('[aura] ratbag:resync event received, refreshing…');
        this.refresh();
      }).then((unlisten) => {
        this.unlistenResync = unlisten;
      });
    }
  }

  async refresh(): Promise<void> {
    if (!this.isConnected) return;
    try {
      this.devices = await listDevices();
      if (this.activeDevicePath) {
        this.activeDevice = await getDevice(this.activeDevicePath);
      }
    } catch (e) {
      this.error = String(e);
    }
  }

  async selectDevice(path: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.activeDevicePath = path;
      this.activeDevice = await getDevice(path);
      this.activeProfileIndex = this.activeDevice.profiles.find((p) => p.is_active)?.index ?? 0;
      console.log('[aura] selectDevice done:', this.activeDevice.name, 'profile:', this.activeProfileIndex);
    } catch (e) {
      console.error('[aura] selectDevice error:', e);
      this.error = String(e);
      this.activeDevice = null;
    } finally {
      this.loading = false;
    }
  }

  selectProfile(index: number): void {
    this.activeProfileIndex = index;
  }

  async commit(): Promise<number> {
    if (!this.activeDevicePath) throw new Error('No device selected');
    const code = await commitDevice(this.activeDevicePath);
    /* Refresh state after commit to pick up cleared dirty flags */
    await this.refresh();
    return code;
  }

  setActiveDevice(device: DeviceDto): void {
    this.activeDevice = device;
  }

  clearError(): void {
    this.error = null;
  }
}

/* Singleton instance — shared across all components */
export const deviceStore = new DeviceStore();
