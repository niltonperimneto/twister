/* Update-checker store — Svelte 5 runes singleton.
 *
 * Wraps @tauri-apps/plugin-updater. On startup we do one silent check ~5s after
 * mount so the UI is responsive first; user-driven checks come from the
 * AboutPage button. Installation uses the plugin's bundled dialog (configured
 * via `plugins.updater.dialog = true` in tauri.conf.json) plus
 * `process.relaunch()` to come back into the new build.
 *
 * The updater plugin is a no-op when the running build isn't an AppImage (the
 * plugin only knows how to self-replace AppImages on Linux), and check() will
 * return `null` / throw if `plugins.updater` isn't yet configured in
 * tauri.conf.json — both treated as "no update" so dev / Flatpak / source
 * builds run cleanly without bothering the user. */

import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface AvailableUpdate {
  version: string;
  currentVersion: string;
  notes: string | null;
}

const STARTUP_DELAY_MS = 5_000;

class UpdaterStore {
  status: UpdaterStatus = $state('idle');
  available: AvailableUpdate | null = $state(null);
  lastChecked: number | null = $state(null);
  error: string | null = $state(null);

  /* Holds the in-flight Update handle when one is found, so installNow()
   * doesn't have to re-fetch the manifest. */
  private pendingUpdate: Update | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasUpdate: boolean = $derived(this.status === 'available' && this.available !== null);

  /* Silent check shortly after the UI mounts. Failures are swallowed so the
   * About page doesn't shout at users on dev / Flatpak / source builds. */
  init(): void {
    if (this.startupTimer) return;
    this.startupTimer = setTimeout(() => {
      void this.checkInternal(/* silent */ true);
    }, STARTUP_DELAY_MS);
  }

  /* User-triggered check (Check for updates button). Surfaces errors. */
  async checkNow(): Promise<void> {
    await this.checkInternal(/* silent */ false);
  }

  /* Drive the plugin's download + verify + relaunch flow. */
  async installNow(): Promise<void> {
    if (!this.pendingUpdate) {
      this.error = 'No update is currently available to install.';
      this.status = 'error';
      return;
    }
    this.status = 'downloading';
    this.error = null;
    try {
      await this.pendingUpdate.downloadAndInstall();
      this.status = 'ready';
      await relaunch();
    } catch (e) {
      console.error('[updater] install failed:', e);
      this.error = String(e);
      this.status = 'error';
    }
  }

  private async checkInternal(silent: boolean): Promise<void> {
    this.status = 'checking';
    this.error = null;
    try {
      const update = await check();
      this.lastChecked = Date.now();
      if (update) {
        this.pendingUpdate = update;
        this.available = {
          version: update.version,
          currentVersion: update.currentVersion,
          notes: update.body ?? null,
        };
        this.status = 'available';
      } else {
        this.pendingUpdate = null;
        this.available = null;
        this.status = 'idle';
      }
    } catch (e) {
      this.lastChecked = Date.now();
      this.pendingUpdate = null;
      this.available = null;
      if (silent) {
        /* No endpoints configured, network down, Flatpak build, etc. The
         * intent of the silent check is precisely to not bother the user when
         * any of these happen. Log only. */
        console.info('[updater] silent check skipped:', e);
        this.status = 'idle';
      } else {
        console.error('[updater] check failed:', e);
        this.error = String(e);
        this.status = 'error';
      }
    }
  }
}

export const updaterStore = new UpdaterStore();
